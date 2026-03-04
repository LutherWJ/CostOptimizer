import { IPriceProvider } from "../types";
import { 
  LaptopSkuRepository, 
  ProductLineRepository,
  PriceHistoryRepository
} from "../repositories";

export class PriceSyncJob {
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
        // We need the manufacturer/brand for a better search
        const productLine = await this.lineRepo.findById(sku.product_line_id);
        const brand = productLine?.manufacturer || "Unknown";

        for (const provider of this.providers) {
          console.log(`[${provider.vendorName}] Fetching price for ${brand} ${sku.sku_number}...`);
          
          const result = await provider.getLatestPrice(brand, sku.sku_number);
          
          if (result) {
            await this.priceRepo.add({
              laptop_sku_id: sku.id,
              vendor: result.vendor,
              price_usd: result.price_usd,
              purchase_url: result.purchase_url,
              is_refurbished: result.is_refurbished
            });
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
