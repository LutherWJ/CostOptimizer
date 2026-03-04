import type { IIcecatService } from "../types";
import { LaptopSkuRepository, ProductLineRepository } from "../repositories";

export class LaptopDiscoveryJob {
  constructor(
    private icecat: IIcecatService,
    private skuRepo: LaptopSkuRepository,
    private lineRepo: ProductLineRepository,
  ) {}

  /**
   * Runs the discovery process.
   * 1. Fetches the latest index of laptops from Icecat.
   * 2. Filters for items not already in our database.
   * 3. Fetches full specs for new items and saves them.
   */
  async run(limit: number = 50) {
    console.log(`Starting Laptop Discovery Job (Limit: ${limit})...`);

    const index = await this.icecat.getDiscoveryIndex(limit);
    console.log(`Discovered ${index.length} items from Icecat index.`);

    let newItemsCount = 0;
    let errorCount = 0;

    for (const item of index) {
      try {
        // 1. Check if SKU already exists
        const existingSku = await this.skuRepo.findBySkuNumber(item.sku);
        if (existingSku) {
          // In a more complex job, we might check updated_at to see if we should refresh
          continue;
        }

        console.log(
          `New SKU found: ${item.brand} ${item.sku}. Fetching specs...`,
        );

        // 2. Fetch detailed specs
        const specs = await this.icecat.getProductSpecs(item.brand, item.sku);

        if (!specs) {
          console.warn(
            `Could not find detailed specs for ${item.brand} ${item.sku}`,
          );
          continue;
        }

        // 3. Upsert Product Line (Chassis)
        // We often have to derive the line name from the product name if not explicitly in specs
        // For now, we'll use a generic line name or the brand
        const lineId = await this.lineRepo.upsert(item.brand, item.brand);

        // 4. Save the SKU
        await this.skuRepo.upsert(lineId, item.sku, specs);

        newItemsCount++;
        console.log(`Successfully imported ${item.brand} ${item.sku}`);

        // Rate limiting: Be nice to Icecat's Live API
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (err) {
        console.error(`Failed to process ${item.brand} ${item.sku}:`, err);
        errorCount++;
      }
    }

    console.log(`Discovery Job Finished.`);
    console.log(`- New Items: ${newItemsCount}`);
    console.log(`- Errors: ${errorCount}`);
  }
}
