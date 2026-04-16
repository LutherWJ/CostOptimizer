import { db } from "./repositories/connection";
import { logger } from "./utils/logger";

async function migrate() {
  try {
    logger.info("Starting migration: Adding marketing_name to laptop_skus...");

    // ADD COLUMN IF NOT EXISTS is supported in modern Postgres
    await db`
      ALTER TABLE laptop_skus 
      ADD COLUMN IF NOT EXISTS marketing_name TEXT;
    `;

    logger.info("✅ Successfully added 'marketing_name' column.");

  } catch (err: any) {
    logger.error("Migration failed:", err.message);
  } finally {
    await db.close();
    process.exit(0);
  }
}

migrate();
