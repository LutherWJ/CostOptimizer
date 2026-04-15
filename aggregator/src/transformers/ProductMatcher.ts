import { AliasRepository } from "../repositories/AliasRepository";
import { OllamaService } from "../extractors/OllamaService";
import { LaptopSkuRepository } from "../repositories/LaptopSkuRepository";

export class ProductMatcher {
  private aliasRepo: AliasRepository;
  private skuRepo: LaptopSkuRepository;
  private ollamaService: OllamaService;
  private threshold: number;

  constructor(
    aliasRepo: AliasRepository = new AliasRepository(),
    skuRepo: LaptopSkuRepository = new LaptopSkuRepository(),
    ollamaService: OllamaService = new OllamaService(),
    threshold: number = 0.85
  ) {
    this.aliasRepo = aliasRepo;
    this.skuRepo = skuRepo;
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
    const normalized = this.normalize(rawTitle);
    const fuzzyMatch = await this.skuRepo.findFuzzy(normalized);
    if (fuzzyMatch && fuzzyMatch.score >= this.threshold) {
      console.log(`[Tier 2] Fuzzy Match for "${rawTitle}" -> ${fuzzyMatch.id} (Score: ${fuzzyMatch.score})`);
      await this.aliasRepo.saveAlias(fuzzyMatch.id, rawTitle, fuzzyMatch.score);
      return fuzzyMatch.id;
    }

    // Tier 3: LLM Extraction Fallback
    console.log(`[Tier 3] Falling back to LLM for "${rawTitle}"...`);
    const llmExtraction = await this.ollamaService.extractProductDetails(rawTitle);
    
    if (llmExtraction && llmExtraction.sku) {
      // Look up the extracted SKU directly
      const skuResult = await this.skuRepo.findBySkuNumber(llmExtraction.sku);
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
}
