import type { IIcecatService } from "../types";
import { 
  LaptopSkuRepository, 
  ProductLineRepository 
} from "../repositories";
import { HardwareSpecsTransformer } from "../transformers/HardwareSpecsTransformer";
import { logger } from "../utils/logger";

export class LaptopDiscoveryJob {
  private transformer = new HardwareSpecsTransformer();

  constructor(
    private icecat: IIcecatService,
    private skuRepo: LaptopSkuRepository,
    private lineRepo: ProductLineRepository
  ) {}

  /**
   * Runs the discovery process.
   */
  async run(sinceDate: Date, limit?: number) {
    logger.info(`Starting Laptop Discovery Job (Since: ${sinceDate.getFullYear()}, Limit: ${limit || 'None'})...`);
    
    // Fetch a larger buffer from the index to account for invalid items
    // If no limit is provided, we fetch everything.
    // If a limit is provided, we fetch 10x that amount from the index to ensure we find enough valid ones.
    const indexLimit = limit ? limit * 10 : undefined;
    const index = await this.icecat.getDiscoveryIndex(sinceDate, indexLimit);
    logger.info(`Found ${index.length} potential items in Icecat index.`);

    let newItemsCount = 0;
    let skipCount = 0;
    let processedCount = 0;
    let invalidSpecsCount = 0;

    for (const item of index) {
      if (limit && newItemsCount >= limit) break;
      
      processedCount++;
      
      const existingSku = await this.skuRepo.findBySkuNumber(item.sku);
      if (existingSku) {
        skipCount++;
        continue; 
      }

      try {
        const rawSpecs = await this.icecat.getProductSpecs(item.brand, item.sku, item.icecatId);
        
        if (!rawSpecs) {
          invalidSpecsCount++;
          continue;
        }

        // 1. Validate using Transformer
        const validation = this.transformer.validate(rawSpecs);
        if (!validation.success) {
          // Silent skip for invalid specs during discovery to keep logs clean
          // unless it's a very high number
          invalidSpecsCount++;
          continue;
        }
        const specs = validation.data!;

        // 2. Canonicalize Brand using Transformer
        const brandName = this.transformer.canonicalizeBrand(item.brand, rawSpecs);

        // 3. Coordinate storage with Repositories
        const lineId = await this.lineRepo.upsert(brandName, brandName);
        await this.skuRepo.upsert(lineId, item.sku, specs);
        
        newItemsCount++;
        logger.info(`[${newItemsCount}] Imported ${brandName} ${item.sku}`);
      } catch (err) {
        logger.error(`Error processing ${item.brand} ${item.sku}:`, err);
        invalidSpecsCount++;
      }

      if (processedCount % 50 === 0) {
         logger.info(`Progress: Scanned ${processedCount} potential items...`);
      }
    }

    logger.info(`Discovery Job Finished.`);
    logger.info(`- New Items: ${newItemsCount}`);
    logger.info(`- Invalid Specs (Skipped): ${invalidSpecsCount}`);
    logger.info(`- Already Exist (Skipped): ${skipCount}`);
  }
}
