import { IPriceProvider } from "../types";
import { 
  LaptopSkuRepository, 
  ProductLineRepository,
  PriceHistoryRepository
} from "../repositories";
import { PriceTransformer } from "../transformers/PriceTransformer";

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
    console.log("Starting Price Sync Job...");
    
    // Fetch all active SKUs that need pricing
    const skus = await this.skuRepo.findAllActive();
    console.log(`Checking prices for ${skus.length} SKUs across ${this.providers.length} providers.`);

    let pricesAdded = 0;
    let errors = 0;

    for (const sku of skus) {
      try {
        // Coordination logic: Need manufacturer/brand for a better search
        const productLine = await this.lineRepo.findById(sku.product_line_id);
        const brand = productLine?.manufacturer || "Unknown";

        for (const provider of this.providers) {
          console.log(`[${provider.vendorName}] Fetching price for ${brand} ${sku.sku_number}...`);
          
          const result = await provider.getLatestPrice(brand, sku.sku_number);
          
          if (result) {
            // Transformation logic delegated
            const priceRecord = this.transformer.transformPrice(sku.id, result);
            
            await this.priceRepo.add(priceRecord);
            pricesAdded++;
            console.log(`- Found: $${result.price_usd} (${result.is_refurbished ? 'Refurb' : 'New'})`);
          } else {
            console.log(`- No result found on ${provider.vendorName}`);
          }

          // Rate limiting: Be respectful to vendor APIs
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (err) {
        console.error(`Error syncing prices for SKU ${sku.sku_number}:`, err);
        errors++;
      }
    }

    console.log("Price Sync Job Finished.");
    console.log(`- Prices recorded: ${pricesAdded}`);
    console.log(`- Errors: ${errors}`);
  }
}
