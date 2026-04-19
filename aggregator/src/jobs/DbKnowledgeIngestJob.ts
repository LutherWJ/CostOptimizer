import { createHash } from "node:crypto";
import { logger } from "../utils/logger";
import { chunkText } from "../utils/textChunker";
import { KnowledgeRepository } from "../repositories/KnowledgeRepository";
import { OllamaService } from "../extractors/OllamaService";
import { db } from "../repositories/connection";

function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function toPlainTextWorkload(row: {
  id: string;
  workload_name: string;
  min_specs: any;
  description: string | null;
}): { title: string; content: string } {
  const minSpecs =
    typeof row.min_specs === "string" ? JSON.parse(row.min_specs) : row.min_specs;

  const content =
    `# Workload Requirement: ${row.workload_name}\n\n` +
    (row.description ? `Description: ${row.description}\n\n` : "") +
    `Minimum specs (JSON):\n` +
    "```json\n" +
    `${JSON.stringify(minSpecs ?? {}, null, 2)}\n` +
    "```\n";

  return {
    title: `Workload: ${row.workload_name}`,
    content,
  };
}

export class DbKnowledgeIngestJob {
  constructor(
    private knowledgeRepo: KnowledgeRepository,
    private ollama: OllamaService,
  ) {}

  async ingestWorkloadRequirements(): Promise<void> {
    logger.info("[Knowledge] Ingesting DB table: workload_requirements");

    const rows = await db<{
      id: string;
      workload_name: string;
      min_specs: any;
      description: string | null;
    }[]>`
      SELECT id, workload_name, min_specs, description
      FROM workload_requirements
      ORDER BY workload_name ASC
    `;

    logger.info(`[Knowledge] Found ${rows.length} workload requirement row(s).`);

    for (const row of rows as any[]) {
      const { title, content } = toPlainTextWorkload(row);
      const contentHash = sha256(content);
      const sourceType = "db";
      const sourceUri = `workload_requirements/${row.id}`;

      const existing = await this.knowledgeRepo.getDocumentHash({
        sourceType,
        sourceUri,
      });

      if (existing?.content_hash === contentHash) {
        continue;
      }

      const chunks = chunkText(content, { maxChars: 1800 });
      const embeddings = await this.ollama.embed(chunks);
      if (!embeddings || !Array.isArray(embeddings)) {
        throw new Error(
          `[Knowledge] Embedding failed for DB row ${sourceUri}: no embeddings returned`,
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
    }

    logger.info("[Knowledge] DB ingestion complete: workload_requirements");
  }

  async ingestSoftwareRequirements(): Promise<void> {
    logger.info("[Knowledge] Ingesting DB table: software_requirements");

    const workloadRows = await db<{
      workload_name: string;
      min_specs: any;
      description: string | null;
    }[]>`
      SELECT workload_name, min_specs, description
      FROM workload_requirements
      ORDER BY workload_name ASC
    `;

    const workloadByName = new Map<
      string,
      { min_specs: any; description: string | null }
    >();
    for (const w of workloadRows as any[]) {
      workloadByName.set(w.workload_name, { min_specs: w.min_specs, description: w.description ?? null });
    }

    const rows = await db<{
      id: string;
      software_key: string;
      software_name: string;
      description: string | null;
      required_workloads: any;
      os_requirement: string;
      source_url: string | null;
      last_verified: string | null;
    }[]>`
      SELECT
        id,
        software_key,
        software_name,
        description,
        required_workloads,
        os_requirement,
        source_url,
        last_verified
      FROM software_requirements
      ORDER BY software_key ASC
    `;

    logger.info(`[Knowledge] Found ${rows.length} software requirement row(s).`);

    for (const row of rows as any[]) {
      const requiredWorkloads =
        typeof row.required_workloads === "string"
          ? JSON.parse(row.required_workloads)
          : row.required_workloads;

      const workloadDetails: string[] = [];
      const requiredNames = Array.isArray(requiredWorkloads)
        ? requiredWorkloads.filter((v) => typeof v === "string")
        : [];

      for (const name of requiredNames) {
        const w = workloadByName.get(name);
        if (!w) continue;

        const minSpecs = typeof w.min_specs === "string" ? JSON.parse(w.min_specs) : w.min_specs;

        workloadDetails.push(
          `### Workload: ${name}\n\n` +
            (w.description ? `Description: ${w.description}\n\n` : "") +
            "Minimum specs (JSON):\n" +
            "```json\n" +
            `${JSON.stringify(minSpecs ?? {}, null, 2)}\n` +
            "```\n",
        );
      }

      const content =
        `# Software Requirement: ${row.software_name}\n\n` +
        `Key: ${row.software_key}\n\n` +
        (row.description ? `Description: ${row.description}\n\n` : "") +
        `OS requirement: ${row.os_requirement}\n\n` +
        (row.source_url ? `Source: ${row.source_url}\n\n` : "") +
        (row.last_verified ? `Last verified: ${row.last_verified}\n\n` : "") +
        `Required workloads (JSON):\n` +
        "```json\n" +
        `${JSON.stringify(requiredWorkloads ?? [], null, 2)}\n` +
        "```\n\n" +
        (workloadDetails.length
          ? `Workload minimums (from our DB):\n\n${workloadDetails.join("\n")}`
          : "");

      const contentHash = sha256(content);
      const sourceType = "db";
      const sourceUri = `software_requirements/${row.id}`;

      const existing = await this.knowledgeRepo.getDocumentHash({
        sourceType,
        sourceUri,
      });

      if (existing?.content_hash === contentHash) {
        continue;
      }

      const chunks = chunkText(content, { maxChars: 1800 });
      const embeddings = await this.ollama.embed(chunks);
      if (!embeddings || !Array.isArray(embeddings)) {
        throw new Error(
          `[Knowledge] Embedding failed for DB row ${sourceUri}: no embeddings returned`,
        );
      }

      const docId = await this.knowledgeRepo.upsertDocument({
        sourceType,
        sourceUri,
        title: `Software: ${row.software_name}`,
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
    }

    logger.info("[Knowledge] DB ingestion complete: software_requirements");
  }
}
