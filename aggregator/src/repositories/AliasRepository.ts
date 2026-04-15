import { db } from "./connection";

export interface SkuAlias {
  id: string;
  sku_id: string;
  raw_string: string;
  confidence_score: number;
  created_at: Date;
}

export class AliasRepository {
  /**
   * Initializes the sku_aliases table if it doesn't exist.
   * Also enables pg_trgm extension.
   */
  async initializeSchema(): Promise<void> {
    try {
      // Enable pg_trgm extension if not already enabled
      await db`CREATE EXTENSION IF NOT EXISTS pg_trgm;`;

      await db`
        CREATE TABLE IF NOT EXISTS sku_aliases (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          sku_id UUID NOT NULL REFERENCES laptop_skus(id) ON DELETE CASCADE,
          raw_string TEXT NOT NULL UNIQUE,
          confidence_score NUMERIC(3, 2) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `;
      
      // Index for exact lookups
      await db`
        CREATE INDEX IF NOT EXISTS idx_sku_aliases_raw_string 
        ON sku_aliases (raw_string);
      `;
      
      // Index for fuzzy searching on laptop_skus if not exists
      // Assuming sku_number is what we match against or a combination
      await db`
        CREATE INDEX IF NOT EXISTS idx_laptop_skus_trgm 
        ON laptop_skus USING gin (sku_number gin_trgm_ops);
      `;

      console.log("Initialized sku_aliases schema.");
    } catch (err) {
      console.error("Failed to initialize sku_aliases schema", err);
    }
  }

  async findAlias(rawString: string): Promise<SkuAlias | null> {
    const result = await db`
      SELECT * FROM sku_aliases 
      WHERE raw_string = ${rawString} 
      LIMIT 1;
    `;
    return result.length > 0 ? (result[0] as SkuAlias) : null;
  }

  async saveAlias(skuId: string, rawString: string, confidence: number): Promise<string> {
    const result = await db`
      INSERT INTO sku_aliases (sku_id, raw_string, confidence_score)
      VALUES (${skuId}, ${rawString}, ${confidence})
      ON CONFLICT (raw_string) DO UPDATE
      SET sku_id = EXCLUDED.sku_id,
          confidence_score = EXCLUDED.confidence_score
      RETURNING id;
    `;
    return result[0].id as string;
  }
}
