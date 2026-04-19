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

      // 4. Pricing Coverage
      const pricing = await this.auditRepo.getPricingCoverage();
      console.log("\nPricing Coverage:");
      console.table(pricing);

      // 5. Workload Suitability
      const suitability = await this.auditRepo.getSuitabilityCoverage();
      console.log("\nWorkload Suitability Coverage:");
      console.table(suitability);

      // 6. Materialized View Status
      const viewStatus = await this.auditRepo.getMaterializedViewStatus();
      console.log("\nMaterialized View Status (Total Recommendations):");
      console.table(viewStatus);

      // 7. Pipeline Failures (High Price/Performance but NO Workloads)
      const failures = await this.auditRepo.getPipelineFailures();
      if (failures.length > 0) {
        console.log("\nPipeline Failures: Laptops with Price + Benchmarks but NO Suitable Workloads:");
        console.table(failures);
      } else {
        console.log("\nNo major pipeline failures detected (Price + Benchmarks -> Workload link is healthy).");
      }
    } catch (err: any) {
      logger.error("Audit Job failed:", err.message);
      throw err;
    }

    logger.info("--- Audit Completed ---");
  }
}
