import { AuditRepository } from "../repositories/AuditRepository";
import { logger } from "../utils/logger";

export class AuditJob {
  constructor(private auditRepo: AuditRepository) {}

  async run() {
    logger.info("--- Starting Database Quality Audit ---");

    try {
      // 1. Manufacturer Spread
      const spread = await this.auditRepo.getManufacturerSpread();
      console.log("\nManufacturer Spread:");
      console.table(spread);

      // 2. Benchmark Coverage
      const coverage = await this.auditRepo.getBenchmarkCoverage();
      console.log("\nBenchmark Coverage:");
      console.table(coverage);

      // 3. Unmapped Components
      const unmappedCpus = await this.auditRepo.getUnmappedCpus();
      if (unmappedCpus.length > 0) {
        console.log("\nSample of Unmapped CPUs (Missing Benchmarks):");
        console.table(unmappedCpus);
      }

      const unmappedGpus = await this.auditRepo.getUnmappedGpus();
      if (unmappedGpus.length > 0) {
        console.log("\nSample of Unmapped GPUs (Missing Benchmarks):");
        console.table(unmappedGpus);
      }
    } catch (err: any) {
      logger.error("Audit Job failed:", err.message);
      throw err;
    }

    logger.info("--- Audit Completed ---");
  }
}
