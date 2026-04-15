import type { IBenchmarkProvider } from "../types";
import { ComponentBenchmarkRepository } from "../repositories";
import { BenchmarkTransformer } from "../transformers/BenchmarkTransformer";
import { logger } from "../utils/logger";

export class BenchmarkSyncJob {
  private transformer = new BenchmarkTransformer();

  constructor(
    private providers: IBenchmarkProvider[],
    private benchmarkRepo: ComponentBenchmarkRepository
  ) {}

  /**
   * Syncs benchmarks from all provided benchmark sources.
   */
  async run() {
    logger.info("Starting Benchmark Sync Job...");
    
    let totalUpserted = 0;

    for (const provider of this.providers) {
      logger.info(`[${provider.name}] Fetching benchmarks...`);
      
      const benchmarks = await provider.getBenchmarks();
      logger.info(`[${provider.name}] Found ${benchmarks.length} benchmarks.`);

      for (const benchmark of benchmarks) {
        // Transformation logic delegated
        const canonical = this.transformer.transformBenchmark(benchmark);

        await this.benchmarkRepo.upsertBenchmark(
          canonical.name,
          canonical.type,
          canonical.score,
          canonical.extra_data
        );
        totalUpserted++;
      }
    }

    logger.info("Benchmark Sync Job Finished.");
    logger.info(`- Benchmarks updated: ${totalUpserted}`);
  }
}
