import type { IPriceProvider } from "../types";
import { 
  LaptopSkuRepository, 
  ProductLineRepository,
  PriceHistoryRepository
} from "../repositories";
import { PriceTransformer } from "../transformers/PriceTransformer";
import { logger } from "../utils/logger";

export class PriceSyncJob {
  private transformer = new PriceTransformer();

  constructor(
    private providers: IPriceProvider[],
    private skuRepo: LaptopSkuRepository,
    private lineRepo: ProductLineRepository,
    private priceRepo: PriceHistoryRepository
  ) {}

  /**
   * Syncs prices for all active laptops across all providers.
   */
  async run() {
    logger.info("Starting Price Sync Job...");
    
    // Fetch all active SKUs that need pricing
    const skus = await this.skuRepo.findAllActive();
    logger.info(`Checking prices for ${skus.length} SKUs across ${this.providers.length} providers.`);

    let pricesAdded = 0;

    for (const sku of skus) {
      // Coordination logic: Need manufacturer/brand for a better search
      const productLine = await this.lineRepo.findById(sku.product_line_id);
      const brand = productLine?.manufacturer || "Unknown";

      for (const provider of this.providers) {
        const searchQuery = sku.marketing_name || sku.sku_number;
        logger.info(`[${provider.vendorName}] Fetching price for ${brand} ${searchQuery}...`);
        
        const result = await provider.getLatestPrice(brand, sku.sku_number, sku.marketing_name);
        
        if (result) {
          // Transformation logic delegated
          const priceRecord = this.transformer.transformPrice(sku.id, result);
          
          await this.priceRepo.add(priceRecord);
          pricesAdded++;
          logger.info(`- Found: $${result.price_usd} (${result.is_refurbished ? 'Refurb' : 'New'})`);
        } else {
          logger.info(`- No result found on ${provider.vendorName}`);
        }

        // Rate limiting: Be respectful to vendor APIs
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    logger.info("Price Sync Job Finished.");
    logger.info(`- Prices recorded: ${pricesAdded}`);
  }
}
