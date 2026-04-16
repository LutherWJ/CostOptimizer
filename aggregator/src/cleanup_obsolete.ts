import { db } from "./repositories/connection";
import { WORKLOAD_DEFINITIONS } from "./config/workloads";
import { logger } from "./utils/logger";

async function cleanup() {
  try {
    // Calculate absolute minimum requirements from workload definitions
    const minRamRequired = Math.min(...WORKLOAD_DEFINITIONS.map(w => w.min_specs.ram_gb));
    const minStorageRequired = Math.min(...WORKLOAD_DEFINITIONS.map(w => w.min_specs.storage_gb || 0));

    logger.info(`Cleaning up obsolete hardware...`);
    logger.info(`Criteria: RAM < ${minRamRequired}GB OR Storage < ${minStorageRequired}GB`);

    // In PostgreSQL, we can query JSONB fields using ->> operator and cast to integer
    const result = await db`
      DELETE FROM laptop_skus 
      WHERE (hardware_specs->>'ram_gb')::int < ${minRamRequired} 
         OR (hardware_specs->>'storage_gb')::int < ${minStorageRequired}
      RETURNING sku_number;
    `;

    logger.info(`Successfully deleted ${result.length} obsolete laptops from the database.`);
    if (result.length > 0) {
      const deletedSkus = result.map((r: any) => r.sku_number).join(", ");
      logger.info(`Deleted SKUs: ${deletedSkus}`);
    }

  } catch (err: any) {
    logger.error("Cleanup failed:", err.message);
  } finally {
    process.exit(0);
  }
}

cleanup();
