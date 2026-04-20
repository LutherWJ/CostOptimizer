import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join, relative } from "node:path";
import { readdir } from "node:fs/promises";
import { chunkText } from "../utils/textChunker";
import type { KnowledgeSourceType } from "../repositories/KnowledgeRepository";
import { KnowledgeRepository } from "../repositories/KnowledgeRepository";
import { OllamaService } from "../extractors/OllamaService";
import { logger } from "../utils/logger";

async function listFilesRecursive(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const out: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      const subFiles = await listFilesRecursive(fullPath);
      for (const file of subFiles) {
        out.push(file);
      }
    } else if (entry.isFile()) {
      out.push(fullPath);
    }
  }

  return out;
}

function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function tryTitleFromMarkdown(md: string): string | null {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  for (const line of lines) {
    const m = line.match(/^#\s+(.+)\s*$/);
    if (m) return m[1]!.trim();
  }
  return null;
}

export class KnowledgeIngestJob {
  constructor(
    private knowledgeRepo: KnowledgeRepository,
    private ollama: OllamaService,
  ) {}

  async ingestMarkdownDirectory(params: {
    dir: string;
    sourceType?: KnowledgeSourceType;
    maxCharsPerChunk?: number;
  }): Promise<void> {
    const sourceType = params.sourceType ?? "md";
    const root = params.dir;
    const rootRel = relative(process.cwd(), root).replace(/\\/g, "/").toLowerCase();
    const excludeDbExports =
      rootRel === "knowledge" || rootRel.endsWith("/knowledge") || rootRel.endsWith("/knowledge/");

    logger.info(`[Knowledge] Scanning ${root}...`);
    const files = (await listFilesRecursive(root)).filter((absPath) => {
      if (!absPath.toLowerCase().endsWith(".md")) return false;
      if (!excludeDbExports) return true;

      const relPath = relative(process.cwd(), absPath).replace(/\\/g, "/").toLowerCase();
      return !relPath.startsWith("knowledge/db/");
    });

    logger.info(`[Knowledge] Found ${files.length} markdown file(s).`);

    for (const absPath of files) {
      const md = await readFile(absPath, "utf8");
      const content = md.trim();
      if (!content) continue;

      const contentHash = sha256(content);
      const sourceUri = relative(process.cwd(), absPath).replace(/\\/g, "/");
      const existing = await this.knowledgeRepo.getDocumentHash({
        sourceType,
        sourceUri,
      });

      if (existing?.content_hash === contentHash) {
        logger.info(`[Knowledge] Skipping unchanged: ${sourceUri}`);
        continue;
      }

      const title = tryTitleFromMarkdown(content) || sourceUri;
      const chunks = chunkText(content, { maxChars: params.maxCharsPerChunk ?? 1800 });

      if (chunks.length === 0) continue;

      const embeddings = await this.ollama.embed(chunks);
      if (!embeddings || !Array.isArray(embeddings)) {
        throw new Error(
          `[Knowledge] Embedding failed for ${sourceUri}: no embeddings returned`,
        );
      }
      if (embeddings.length !== chunks.length) {
        throw new Error(
          `[Knowledge] Embedding failed for ${sourceUri}: expected ${chunks.length} vectors, got ${embeddings.length}`,
        );
      }

      const docId = await this.knowledgeRepo.upsertDocument({
        sourceType,
        sourceUri,
        title,
        contentHash,
        content,
      });

      await this.knowledgeRepo.replaceChunks({
        documentId: docId,
        chunks: chunks.map((chunk, idx) => ({
          content: chunk,
          embedding: embeddings[idx] as number[],
        })),
      });

      logger.info(`[Knowledge] Ingested: ${sourceUri} (${chunks.length} chunk(s))`);
    }
  }
}
