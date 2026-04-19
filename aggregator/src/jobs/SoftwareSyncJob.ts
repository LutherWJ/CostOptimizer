import { SOFTWARE_REQUIREMENTS } from "../config/software";
import type { SoftwareRequirementsRepository } from "../repositories";
import { logger } from "../utils/logger";

export class SoftwareSyncJob {
  constructor(private softwareRepo: SoftwareRequirementsRepository) {}

  async run(): Promise<void> {
    logger.info("Syncing software requirement profiles to DB...");

    for (const def of SOFTWARE_REQUIREMENTS) {
      await this.softwareRepo.upsert({
        software_key: def.software_key,
        software_name: def.software_name,
        description: def.description,
        required_workloads: def.required_workloads,
        os_requirement: def.os_requirement,
        source_url: def.source_url ?? null,
        last_verified: def.last_verified ?? null,
      });
    }

    logger.info(`Synced ${SOFTWARE_REQUIREMENTS.length} software profiles.`);
  }
}

