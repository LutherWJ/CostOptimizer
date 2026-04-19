import { db } from "./connection";

export type KnowledgeSourceType = "md" | "web" | "db" | (string & {});

export interface KnowledgeDocument {
  id: string;
  source_type: KnowledgeSourceType;
  source_uri: string;
  title: string | null;
  content_hash: string;
  content: string;
}

export interface KnowledgeChunk {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  source_type: KnowledgeSourceType;
  source_uri: string;
  title: string | null;
  distance?: number;
}

function toVectorLiteral(embedding: number[]): string {
  const values = embedding.map((v) => (Number.isFinite(v) ? v : 0));
  return `[${values.join(",")}]`;
}

export class KnowledgeRepository {
  async upsertDocument(params: {
    sourceType: KnowledgeSourceType;
    sourceUri: string;
    title?: string | null;
    contentHash: string;
    content: string;
  }): Promise<string> {
    const result = await db`
      INSERT INTO knowledge_documents (source_type, source_uri, title, content_hash, content)
      VALUES (${params.sourceType}, ${params.sourceUri}, ${params.title || null}, ${params.contentHash}, ${params.content})
      ON CONFLICT (source_type, source_uri)
      DO UPDATE SET
        title = COALESCE(EXCLUDED.title, knowledge_documents.title),
        content_hash = EXCLUDED.content_hash,
        content = EXCLUDED.content,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id;
    `;

    if (result.length === 0) {
      throw new Error(
        `Knowledge document upsert failed for ${params.sourceType}:${params.sourceUri}: no rows returned`,
      );
    }
    return (result[0] as any).id as string;
  }

  async getDocumentHash(params: {
    sourceType: KnowledgeSourceType;
    sourceUri: string;
  }): Promise<{ id: string; content_hash: string } | null> {
    const result = await db`
      SELECT id, content_hash
      FROM knowledge_documents
      WHERE source_type = ${params.sourceType} AND source_uri = ${params.sourceUri}
      LIMIT 1;
    `;
    return result.length ? (result[0] as any) : null;
  }

  async replaceChunks(params: {
    documentId: string;
    chunks: { content: string; embedding: number[] }[];
  }): Promise<void> {
    await db.transaction(async (tx) => {
      await tx`DELETE FROM knowledge_chunks WHERE document_id = ${params.documentId}`;

      for (let i = 0; i < params.chunks.length; i++) {
        const chunk = params.chunks[i]!;
        const vector = toVectorLiteral(chunk.embedding);
        await tx`
          INSERT INTO knowledge_chunks (document_id, chunk_index, content, embedding)
          VALUES (${params.documentId}, ${i}, ${chunk.content}, ${vector}::vector)
        `;
      }
    });
  }

  async searchByEmbedding(params: {
    embedding: number[];
    limit?: number;
  }): Promise<KnowledgeChunk[]> {
    const limit = params.limit ?? 8;
    const vector = toVectorLiteral(params.embedding);

    const result = await db`
      SELECT
        kc.id,
        kc.document_id,
        kc.chunk_index,
        kc.content,
        kd.source_type,
        kd.source_uri,
        kd.title,
        (kc.embedding <=> ${vector}::vector) as distance
      FROM knowledge_chunks kc
      JOIN knowledge_documents kd ON kd.id = kc.document_id
      ORDER BY kc.embedding <=> ${vector}::vector
      LIMIT ${limit};
    `;

    return (result as any[]).map((row) => ({
      id: row.id,
      document_id: row.document_id,
      chunk_index: Number(row.chunk_index),
      content: row.content,
      source_type: row.source_type,
      source_uri: row.source_uri,
      title: row.title ?? null,
      distance: row.distance != null ? Number(row.distance) : undefined,
    })) as KnowledgeChunk[];
  }
}
