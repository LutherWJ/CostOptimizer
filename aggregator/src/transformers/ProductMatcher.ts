import { AliasRepository } from "../repositories/AliasRepository";
import { OllamaService } from "../extractors/OllamaService";
import { db } from "../repositories/connection";
import type { LaptopSku } from "../repositories/LaptopSkuRepository";

export class ProductMatcher {
  private aliasRepo: AliasRepository;
  private ollamaService: OllamaService;
  private threshold: number;

  constructor(
    aliasRepo: AliasRepository = new AliasRepository(),
    ollamaService: OllamaService = new OllamaService(),
    threshold: number = 0.85
  ) {
    this.aliasRepo = aliasRepo;
    this.ollamaService = ollamaService;
    this.threshold = threshold;
  }

  /**
   * Orchestrates the 3-tier matching strategy.
   * @param rawTitle The raw product string from an external API
   * @returns The canonical SKU ID, or null if no match could be confidently established.
   */
  async match(rawTitle: string): Promise<string | null> {
    // Tier 1: Cache Hit
    const cachedAlias = await this.aliasRepo.findAlias(rawTitle);
    if (cachedAlias) {
      console.log(`[Tier 1] Cache Hit for "${rawTitle}" -> ${cachedAlias.sku_id}`);
      return cachedAlias.sku_id;
    }

    // Tier 2: Normalized Fuzzy Match using pg_trgm
    const fuzzyMatch = await this.findFuzzyMatch(rawTitle);
    if (fuzzyMatch && fuzzyMatch.score >= this.threshold) {
      console.log(`[Tier 2] Fuzzy Match for "${rawTitle}" -> ${fuzzyMatch.skuId} (Score: ${fuzzyMatch.score})`);
      await this.aliasRepo.saveAlias(fuzzyMatch.skuId, rawTitle, fuzzyMatch.score);
      return fuzzyMatch.skuId;
    }

    // Tier 3: LLM Extraction Fallback
    console.log(`[Tier 3] Falling back to LLM for "${rawTitle}"...`);
    const llmExtraction = await this.ollamaService.extractProductDetails(rawTitle);
    
    if (llmExtraction && llmExtraction.sku) {
      // Look up the extracted SKU directly
      const skuResult = await this.findSkuByNumber(llmExtraction.sku);
      if (skuResult) {
         console.log(`[Tier 3] LLM Extracted SKU ${llmExtraction.sku} matched! Saving alias.`);
         await this.aliasRepo.saveAlias(skuResult.id, rawTitle, 0.99); // High confidence since it was exact matched post-extraction
         return skuResult.id;
      } else {
         console.log(`[Tier 3] LLM Extracted SKU ${llmExtraction.sku} but it was not found in our database.`);
      }
    } else {
      console.log(`[Tier 3] LLM could not extract a valid SKU from "${rawTitle}".`);
    }

    return null; // Unmatched
  }

  private normalize(input: string): string {
    return input.toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  private async findFuzzyMatch(rawTitle: string): Promise<{ skuId: string, score: number } | null> {
    // Use SIMILARITY from pg_trgm. Ensure the extension is enabled (handled in AliasRepository init)
    // We normalize the title and compare to normalized sku_number
    const normalized = this.normalize(rawTitle);
    
    try {
      const results = await db`
        SELECT id, SIMILARITY(LOWER(REGEXP_REPLACE(sku_number, '[^a-z0-9]', '', 'g')), ${normalized}) as score
        FROM laptop_skus
        ORDER BY score DESC
        LIMIT 1;
      `;
      
      if (results.length > 0) {
        const row = results[0];
        return { skuId: row.id as string, score: parseFloat(row.score as string) };
      }
    } catch (err: any) {
      if (err.message.includes("function similarity") && err.message.includes("does not exist")) {
        console.error("pg_trgm extension is not enabled. Run initializeSchema() on AliasRepository.");
      } else {
        console.error("Fuzzy Match Query Error:", err);
      }
    }
    
    return null;
  }

  private async findSkuByNumber(skuNumber: string): Promise<LaptopSku | null> {
    const results = await db`
      SELECT * FROM laptop_skus 
      WHERE LOWER(sku_number) = LOWER(${skuNumber})
      LIMIT 1;
    `;
    
    if (results.length > 0) {
      const row = results[0] as any;
      if (typeof row.hardware_specs === "string") row.hardware_specs = JSON.parse(row.hardware_specs);
      if (typeof row.qualitative_data === "string" && row.qualitative_data !== null) row.qualitative_data = JSON.parse(row.qualitative_data);
      return row as LaptopSku;
    }
    
    return null;
  }
}
