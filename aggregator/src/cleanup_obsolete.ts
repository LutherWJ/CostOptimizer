import { db } from "./repositories/connection";
import { logger } from "./utils/logger";

async function purgeAllData() {
  try {
    logger.info("--- FULL DATABASE PURGE ---");
    logger.info("Clearing all laptop, pricing, and suitability data...");

    // We use TRUNCATE with CASCADE to handle foreign key dependencies in the correct order
    // This clears everything EXCEPT the benchmarks and their aliases
    await db`
      TRUNCATE TABLE 
        sku_aliases, 
        sku_suitability, 
        price_history, 
        laptop_skus, 
        product_lines 
      RESTART IDENTITY CASCADE;
    `;

    logger.info("✅ Successfully cleared all imported data.");
    logger.info("You can now safely run 'discover' to seed with improved metadata.");

  } catch (err: any) {
    logger.error("Purge failed:", err.message);
  } finally {
    await db.close();
    process.exit(0);
  }
}

purgeAllData();
