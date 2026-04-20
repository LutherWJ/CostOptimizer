import type { IIcecatService } from "../types";
import { 
  LaptopSkuRepository, 
  ProductLineRepository 
} from "../repositories";
import { HardwareSpecsTransformer } from "../transformers/HardwareSpecsTransformer";
import { logger } from "../utils/logger";
import { WORKLOAD_DEFINITIONS } from "../config/workloads";

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
    
    // Calculate absolute minimum requirements from workload definitions
    const minRamRequired = WORKLOAD_DEFINITIONS
      .map(w => w.min_specs.ram_gb)
      .reduce((min, val) => Math.min(min, val), Infinity);

    // Filter out 0 or undefined storage requirements before finding the minimum
    const storageSpecs = WORKLOAD_DEFINITIONS
      .map(w => w.min_specs.storage_gb)
      .filter((s): s is number => !!s && s > 0);
    const minStorageRequired = storageSpecs.length > 0 
      ? storageSpecs.reduce((min, val) => Math.min(min, val), Infinity) 
      : 128; // Default to 128GB floor
    
    logger.info(`Quality Filter Active: RAM >= ${minRamRequired}GB, Storage >= ${minStorageRequired}GB`);

    // Fetch a larger buffer from the index to account for invalid items
    const indexLimit = limit ? limit * 50 : undefined;
    const index = await this.icecat.getDiscoveryIndex(sinceDate, indexLimit);
    logger.info(`Found ${index.length} potential items in Icecat index.`);

    let newItemsCount = 0;
    let skipCount = 0;
    let processedCount = 0;
    let invalidSpecsCount = 0;
    let obsoleteSpecsCount = 0;

    for (const item of index) {
      if (limit && newItemsCount >= limit) break;
      
      processedCount++;
      
      const existingSku = await this.skuRepo.findBySkuNumber(item.sku);
      if (existingSku) {
        skipCount++;
        continue; 
      }

      try {
        const result = await this.icecat.getProductSpecs(item.brand, item.sku, item.icecatId);
        
        if (!result) {
          invalidSpecsCount++;
          continue;
        }

        const { specs, marketingName } = result;

        // 1. Validate using Transformer
        const validation = this.transformer.validate(specs);
        if (!validation.success) {
          invalidSpecsCount++;
          continue;
        }
        const validatedSpecs = validation.data!;

        // 2. Apply Quality Filter based on WORKLOAD_DEFINITIONS
        if (validatedSpecs.ram_gb < minRamRequired || validatedSpecs.storage_gb < minStorageRequired) {
          obsoleteSpecsCount++;
          continue;
        }

        // 3. Canonicalize Brand using Transformer
        const brandName = this.transformer.canonicalizeBrand(item.brand, specs);

        // 4. Try to determine a useful product line name
        const lineName = marketingName.split(" ")[0] || brandName;
        
        // 5. Coordinate storage with Repositories
        const lineId = await this.lineRepo.upsert(brandName, lineName);
        await this.skuRepo.upsert(lineId, item.sku, validatedSpecs, null, marketingName);
        
        newItemsCount++;
        logger.info(`[${newItemsCount}] Imported ${brandName} ${marketingName} (${item.sku})`);
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
    logger.info(`- Already Exist (Skipped): ${skipCount}`);
    logger.info(`- Invalid Specs (Skipped): ${invalidSpecsCount}`);
    logger.info(`- Obsolete Hardware (Filtered): ${obsoleteSpecsCount}`);
  }
}
