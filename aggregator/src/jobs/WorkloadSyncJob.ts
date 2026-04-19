import { WORKLOAD_DEFINITIONS } from "../config/workloads";
import type { WorkloadRepository } from "../repositories";
import { logger } from "../utils/logger";

export class WorkloadSyncJob {
  constructor(private workloadRepo: WorkloadRepository) {}

  async run(): Promise<void> {
    logger.info("Syncing workload definitions to DB...");

    for (const def of WORKLOAD_DEFINITIONS) {
      await this.workloadRepo.upsert(def.name, def.min_specs, def.description);
    }

    logger.info(`Synced ${WORKLOAD_DEFINITIONS.length} workload definitions.`);
  }
}

