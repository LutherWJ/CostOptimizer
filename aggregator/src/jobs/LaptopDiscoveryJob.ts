import { IIcecatService } from "../types";
import { 
  LaptopSkuRepository, 
  ProductLineRepository 
} from "../repositories";
import hardwareSpecsSchema from "../models/hardwareSpecsSchema";

export class LaptopDiscoveryJob {
  constructor(
    private icecat: IIcecatService,
    private skuRepo: LaptopSkuRepository,
    private lineRepo: ProductLineRepository
  ) {}

  /**
   * Runs the discovery process.
   */
  async run(sinceDate: Date, limit?: number) {
    console.log(`Starting Laptop Discovery Job (Since: ${sinceDate.getFullYear()}, Limit: ${limit || 'None'})...`);
    
    const index = await this.icecat.getDiscoveryIndex(sinceDate, limit);
    console.log(`Discovered ${index.length} items from Icecat index.`);

    let newItemsCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    let processedCount = 0;
    let invalidSpecsCount = 0;

    for (const item of index) {
      processedCount++;
      try {
        const existingSku = await this.skuRepo.findBySkuNumber(item.sku);
        if (existingSku) {
          skipCount++;
          if (processedCount % 1000 === 0) {
            console.log(`Progress: Processed ${processedCount}/${index.length} items...`);
          }
          continue; 
        }

        const specs = await this.icecat.getProductSpecs(item.brand, item.sku, item.icecatId);
        
        if (!specs) {
          console.warn(`Could not find detailed specs for ID: ${item.icecatId} (${item.brand} ${item.sku})`);
          continue;
        }

        // Validate specs against schema
        const validation = hardwareSpecsSchema.safeParse(specs);
        if (!validation.success) {
          invalidSpecsCount++;
          if (invalidSpecsCount % 100 === 0 || index.length < 1000) {
             // console.warn(`Invalid specs for SKU ${item.sku}:`, validation.error.format());
          }
          continue;
        }

        const brandName = item.brand || (specs as any)._brandName || "Unknown";
        const lineId = await this.lineRepo.upsert(brandName, brandName);
        await this.skuRepo.upsert(lineId, item.sku, specs);
        
        newItemsCount++;
        console.log(`[${newItemsCount}] Imported ${brandName} ${item.sku}`);

        // Rate limiting to be polite
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (err) {
        console.error(`Failed to process ${item.brand} ${item.sku}:`, err);
        errorCount++;
      }
    }

    console.log(`Discovery Job Finished.`);
    console.log(`- New Items: ${newItemsCount}`);
    console.log(`- Invalid Specs (Skipped): ${invalidSpecsCount}`);
    console.log(`- Already Exist (Skipped): ${skipCount}`);
    console.log(`- Errors: ${errorCount}`);
  }
}
