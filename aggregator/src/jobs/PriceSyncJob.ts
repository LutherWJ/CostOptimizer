import { 
  LaptopSkuRepository, 
  ProductLineRepository,
  PriceHistoryRepository
} from "../repositories";
import { PriceTransformer } from "../transformers/PriceTransformer";
import { logger } from "../utils/logger";

const VENDORS = ["Amazon", "Best Buy", "Newegg", "B&H Photo Video", "eBay"];

const BRAND_TAX_MODIFIERS: Record<string, number> = {
  "apple": 1.3,
  "razer": 1.2,
  "asus": 1.05,
  "dell": 1.05,
  "hp": 1.0,
  "lenovo": 1.0,
  "acer": 0.9,
  "msi": 0.95
};

export class PriceSyncJob {
  private transformer = new PriceTransformer();

  constructor(
    private skuRepo: LaptopSkuRepository,
    private lineRepo: ProductLineRepository,
    private priceRepo: PriceHistoryRepository
  ) {}

  /**
   * Syncs mock deterministic prices for all active laptops.
   */
  async run() {
    logger.info("Starting Price Sync Job (Mock Option A)...");
    
    // Fetch all active SKUs WITH benchmarks to calculate price
    const skus = await this.skuRepo.findAllWithBenchmarks();
    logger.info(`Generating prices for ${skus.length} SKUs.`);

    let pricesAdded = 0;

    for (const sku of skus) {
      const brand = sku.manufacturer || "Unknown";
      
      // Calculate Base Price
      const ram = sku.hardware_specs.ram_gb || 8;
      const storage = sku.hardware_specs.storage_gb || 256;
      const cpuScore = sku.cpu_benchmark_score || 2000;
      const gpuScore = sku.gpu_benchmark_score || 0;
      
      const basePrice = 300 + (ram * 5) + (storage * 0.10) + (cpuScore * 0.03) + (gpuScore * 0.05);
      
      // Apply Brand Tax
      const brandKey = brand.toLowerCase();
      const brandModifier = BRAND_TAX_MODIFIERS[brandKey] !== undefined ? BRAND_TAX_MODIFIERS[brandKey] : 1.0;
      const modifiedPrice = basePrice * brandModifier;

      // Determine number of listings (1 to 5)
      const numListings = Math.floor(Math.random() * 5) + 1;
      
      // Shuffle vendors to pick random ones
      const shuffledVendors = [...VENDORS].sort(() => 0.5 - Math.random());
      const selectedVendors = shuffledVendors.slice(0, numListings);

      logger.info(`Generating ${numListings} prices for ${brand} ${sku.sku_number}...`);

      for (const vendor of selectedVendors) {
        // RNG Condition
        const isRefurbished = Math.random() < 0.2; // 20% chance
        const conditionModifier = isRefurbished ? 0.8 : 1.0;
        
        // Vendor Variance (+/- 5%)
        const vendorVariance = 0.95 + (Math.random() * 0.1);
        
        const finalPrice = Math.round((modifiedPrice * conditionModifier * vendorVariance) * 100) / 100;
        
        const mockUrl = `https://mock-${vendor.toLowerCase().replace(/[^a-z0-9]/g, '')}.com/buy/${sku.sku_number}`;

        const result = {
          vendor: vendor,
          price_usd: finalPrice,
          purchase_url: mockUrl,
          is_refurbished: isRefurbished
        };

        const priceRecord = this.transformer.transformPrice(sku.id, result);
        await this.priceRepo.add(priceRecord);
        pricesAdded++;
        logger.info(`- Generated: $${finalPrice} on ${vendor} (${isRefurbished ? 'Refurb' : 'New'})`);
      }
    }

    logger.info("Price Sync Job Finished.");
    logger.info(`- Prices recorded: ${pricesAdded}`);
  }
}
