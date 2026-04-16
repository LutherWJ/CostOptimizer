import type { IPriceProvider, PriceResult } from "../types";
import { ProductMatcher } from "../transformers/ProductMatcher";
import { logger } from "../utils/logger";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export interface SerpApiShoppingResult {
  title: string;
  source: string;
  link: string;
  price: string;
  extracted_price: number;
  delivery?: string;
  thumbnail?: string;
}

export interface SerpApiResponse {
  shopping_results?: SerpApiShoppingResult[];
  search_metadata: {
    status: string;
  };
}

export class SerpApiService implements IPriceProvider {
  private apiKey: string;
  public vendorName = "Google Shopping (via SerpApi)";
  private matcher: ProductMatcher;

  constructor(matcher: ProductMatcher = new ProductMatcher()) {
    this.apiKey = (process.env.SERPAPI_API_KEY || "").trim();
    this.matcher = matcher;

    if (!this.apiKey) {
      throw new Error("CRITICAL: SERPAPI_API_KEY not found in environment variables.");
    }
  }

  /**
   * Fetches the latest prices from Google Shopping using SerpApi.
   * Documentation: https://serpapi.com/google-shopping-results
   */
  async getLatestPrice(brand: string, sku: string): Promise<PriceResult | null> {
    if (!this.apiKey) return null;

    logger.info(`[SerpApi] Searching for: ${brand} ${sku}...`);

    const params = new URLSearchParams({
      engine: "google_shopping",
      q: `${brand} ${sku}`,
      api_key: this.apiKey,
      hl: "en",
      gl: "us",
    });

    try {
      const response = await fetch(`https://serpapi.com/search.json?${params.toString()}`);

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`[SerpApi] Request failed for ${sku}: ${response.statusText} (${response.status})`);
        throw new Error(`SerpApi Error: ${response.statusText} (${response.status}) - ${errorText}`);
      }

      const rawResponse = await response.text();
      
      // Failsafe: Log the raw response to a file immediately
      try {
        const logDir = join(process.cwd(), "storage", "logs", "serpapi");
        await mkdir(logDir, { recursive: true });
        const fileName = `serpapi_${brand.replace(/\s+/g, '_')}_${sku.replace(/\s+/g, '_')}_${Date.now()}.json`;
        await writeFile(join(logDir, fileName), rawResponse);
        logger.info(`[SerpApi] Raw response saved to ${fileName}`);
      } catch (logErr) {
        logger.error(`[SerpApi] Failed to save raw response log:`, logErr);
      }

      const data = JSON.parse(rawResponse) as SerpApiResponse;

      if (!data.shopping_results || data.shopping_results.length === 0) {
        logger.info(`[SerpApi] No results found for ${sku}.`);
        return null;
      }

      logger.info(`[SerpApi] Found ${data.shopping_results.length} results. Verifying with ProductMatcher...`);

      // 1. Filter results to ensure they look like actual laptops
      const laptopsOnly = data.shopping_results.filter((item) => {
        const title = item.title.toLowerCase();
        // Exclude obvious accessories
        const isAccessory = 
          title.includes("case") || 
          title.includes("charger") || 
          title.includes("adapter") || 
          title.includes("sleeve") ||
          title.includes("cable");
        
        return !isAccessory;
      });

      // 2. Use ProductMatcher to robustly verify the title matches the intended SKU
      const validResults = [];
      for (const item of laptopsOnly) {
        // Robust matching using the 3-tier strategy (Cache -> Fuzzy -> LLM)
        const matchedSkuId = await this.matcher.match(item.title);
        
        // Secondary safety: Title should at least mention the SKU string if matcher is unsure
        const title = item.title.toLowerCase();
        const matchesSkuString = title.includes(sku.toLowerCase());

        if (matchedSkuId || matchesSkuString) {
          validResults.push(item);
        }
      }

      if (validResults.length === 0) {
        logger.info(`[SerpApi] No valid matches found for ${sku} after ProductMatcher verification.`);
        return null;
      }

      // 3. Pick the lowest price among valid results
      const sorted = validResults.sort((a, b) => a.extracted_price - b.extracted_price);
      const bestDeal = sorted[0]!;

      logger.info(`[SerpApi] Best deal for ${sku}: $${bestDeal.extracted_price} via ${bestDeal.source}`);

      return {
        vendor: `${this.vendorName} - ${bestDeal.source}`,
        price_usd: bestDeal.extracted_price,
        purchase_url: bestDeal.link,
        is_refurbished: bestDeal.title.toLowerCase().includes("refurbished") || 
                        bestDeal.title.toLowerCase().includes("renewed"),
      };
    } catch (error) {
      logger.error(`[SerpApi] Error processing ${sku}:`, error);
      throw error;
    }
  }
}
