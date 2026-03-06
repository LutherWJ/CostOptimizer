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

    const concurrency = 5;
    const chunks = [];
    for (let i = 0; i < index.length; i += concurrency) {
      chunks.push(index.slice(i, i + concurrency));
    }

    for (const chunk of chunks) {
      await Promise.all(chunk.map(async (item) => {
        processedCount++;
        try {
          const existingSku = await this.skuRepo.findBySkuNumber(item.sku);
          if (existingSku) {
            skipCount++;
            return; 
          }

          const specs = await this.icecat.getProductSpecs(item.brand, item.sku, item.icecatId);
          
          if (!specs) {
            // console.warn(`Could not find detailed specs for ID: ${item.icecatId} (${item.brand} ${item.sku})`);
            return;
          }

          // Validate specs against schema
          const validation = hardwareSpecsSchema.safeParse(specs);
          if (!validation.success) {
            invalidSpecsCount++;
            return;
          }

          const brandName = item.brand || (specs as any)._brandName || "Unknown";
          const lineId = await this.lineRepo.upsert(brandName, brandName);
          await this.skuRepo.upsert(lineId, item.sku, specs);
          
          newItemsCount++;
          console.log(`[${newItemsCount}] Imported ${brandName} ${item.sku}`);

        } catch (err) {
          console.error(`Failed to process ${item.brand} ${item.sku}:`, err);
          errorCount++;
        }
      }));

      if (processedCount % 100 === 0 || processedCount >= index.length) {
         console.log(`Progress: Processed ${processedCount}/${index.length} items...`);
      }
    }

    console.log(`Discovery Job Finished.`);
    console.log(`- New Items: ${newItemsCount}`);
    console.log(`- Invalid Specs (Skipped): ${invalidSpecsCount}`);
    console.log(`- Already Exist (Skipped): ${skipCount}`);
    console.log(`- Errors: ${errorCount}`);
  }
}
