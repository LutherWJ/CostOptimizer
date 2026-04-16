import { IcecatService } from "./extractors/icecat";
import { HardwareSpecsTransformer } from "./transformers/HardwareSpecsTransformer";
import { logger } from "./utils/logger";

async function debugValidation() {
  const icecat = new IcecatService();
  const transformer = new HardwareSpecsTransformer();

  try {
    console.log("Fetching index to find a test SKU...");
    const index = await icecat.getDiscoveryIndex(new Date("2024-01-01"), 5);
    
    if (index.length === 0) {
      console.error("No laptops found in index.");
      return;
    }

    for (const item of index) {
      console.log(`\n--- Testing ${item.brand} ${item.sku} (Icecat ID: ${item.icecatId}) ---`);
      
      const rawSpecs = await icecat.getProductSpecs(item.brand, item.sku, item.icecatId);
      
      if (!rawSpecs) {
        console.warn("Could not fetch specs for this item.");
        continue;
      }

      console.log("Mapped Specs:", JSON.stringify(rawSpecs, null, 2));

      const validation = transformer.validate(rawSpecs);
      if (validation.success) {
        console.log("✅ Validation Succeeded!");
      } else {
        console.log("❌ Validation Failed!");
        console.log("Errors:", JSON.stringify(validation.error?.format(), null, 2));
      }
    }

  } catch (err: any) {
    console.error("Debug script failed:", err.message);
  } finally {
    process.exit(0);
  }
}

debugValidation();
