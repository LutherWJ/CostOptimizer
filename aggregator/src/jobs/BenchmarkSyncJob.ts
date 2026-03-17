import { IBenchmarkProvider } from "../types";
import { ComponentBenchmarkRepository } from "../repositories";
import { BenchmarkTransformer } from "../transformers/BenchmarkTransformer";

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
    console.log("Starting Benchmark Sync Job...");
    
    let totalUpserted = 0;
    let totalErrors = 0;

    for (const provider of this.providers) {
      console.log(`[${provider.name}] Fetching benchmarks...`);
      try {
        const benchmarks = await provider.getBenchmarks();
        console.log(`[${provider.name}] Found ${benchmarks.length} benchmarks.`);

        for (const benchmark of benchmarks) {
          try {
            // Transformation logic delegated
            const canonical = this.transformer.transformBenchmark(benchmark);

            await this.benchmarkRepo.upsertBenchmark(
              canonical.name,
              canonical.type,
              canonical.score,
              canonical.extra_data
            );
            totalUpserted++;
          } catch (err) {
            console.error(`Failed to upsert benchmark ${benchmark.name}:`, err);
            totalErrors++;
          }
        }
      } catch (err) {
        console.error(`Error during benchmark sync from provider ${provider.name}:`, err);
        totalErrors++;
      }
    }

    console.log("Benchmark Sync Job Finished.");
    console.log(`- Benchmarks updated: ${totalUpserted}`);
    console.log(`- Errors encountered: ${totalErrors}`);
  }
}
