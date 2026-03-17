import { 
  LaptopSkuRepository, 
  WorkloadRepository 
} from "../repositories";
import { WORKLOAD_DEFINITIONS } from "../config/workloads";
import { SuitabilityTransformer } from "../transformers/SuitabilityTransformer";

export class SuitabilityJob {
  private transformer = new SuitabilityTransformer();

  constructor(
    private skuRepo: LaptopSkuRepository,
    private workloadRepo: WorkloadRepository
  ) {}

  async run() {
    console.log("Starting Suitability Mapping Job...");

    // 1. Sync Workload Definitions to DB
    const workloadIdMap = new Map<string, string>();
    for (const def of WORKLOAD_DEFINITIONS) {
      const id = await this.workloadRepo.upsert(
        def.name,
        def.min_specs,
        def.description
      );
      workloadIdMap.set(def.name, id);
    }
    console.log(`Synced ${WORKLOAD_DEFINITIONS.length} workload definitions.`);

    // 2. Fetch all active SKUs with benchmarks
    const skus = await this.skuRepo.findAllWithBenchmarks();
    console.log(`Evaluating suitability for ${skus.length} active SKUs...`);

    let updatedCount = 0;

    for (const sku of skus) {
      // Logic delegated to transformer
      const suitableWorkloadIds = this.transformer.mapSuitableWorkloads(
        sku, 
        WORKLOAD_DEFINITIONS,
        workloadIdMap
      );

      await this.skuRepo.updateSuitability(sku.id, suitableWorkloadIds);
      updatedCount++;
    }

    console.log(`Suitability Job Finished. Updated ${updatedCount} SKUs.`);
  }
}
