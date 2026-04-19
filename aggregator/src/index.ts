import { IcecatService } from "./extractors/icecat";
import {
  LaptopSkuRepository,
  ProductLineRepository,
  PriceHistoryRepository,
  ComponentBenchmarkRepository,
  WorkloadRepository,
  KnowledgeRepository,
  SoftwareRequirementsRepository,
  db,
} from "./repositories";
import { LaptopDiscoveryJob } from "./jobs/LaptopDiscoveryJob";
import { PriceSyncJob } from "./jobs/PriceSyncJob";
import { BenchmarkSyncJob } from "./jobs/BenchmarkSyncJob";
import { SuitabilityJob } from "./jobs/SuitabilityJob";
import { NotebookcheckExtractor } from "./extractors/notebookcheck";
import { OllamaService } from "./extractors/OllamaService";
import { AliasSyncJob } from "./jobs/AliasSyncJob";
import { RepairJob } from "./jobs/RepairJob";
import { KnowledgeIngestJob } from "./jobs/KnowledgeIngestJob";
import { DbKnowledgeIngestJob } from "./jobs/DbKnowledgeIngestJob";
import { WorkloadSyncJob } from "./jobs/WorkloadSyncJob";
import { DbDocsExportJob } from "./jobs/DbDocsExportJob";
import { SoftwareSyncJob } from "./jobs/SoftwareSyncJob";
import { AuditJob } from "./jobs/AuditJob";
import { AuditRepository } from "./repositories/AuditRepository";
import { logger } from "./utils/logger";
import { join } from "node:path";

const main = async () => {
  const args = process.argv.slice(2);
  const command = args[0];

  // Initialize Repositories
  const skuRepo = new LaptopSkuRepository();
  const lineRepo = new ProductLineRepository();
  const priceRepo = new PriceHistoryRepository();
  const benchmarkRepo = new ComponentBenchmarkRepository();
  const workloadRepo = new WorkloadRepository();
  const knowledgeRepo = new KnowledgeRepository();
  const softwareRepo = new SoftwareRequirementsRepository();
  const auditRepo = new AuditRepository();

  // Initialize Services
  const icecat = new IcecatService();
  const notebookcheck = new NotebookcheckExtractor();
  const ollama = new OllamaService();

  try {
    switch (command) {
      case "discover": {
        // Usage: discover [year] [limit]
        const sinceYear = parseInt(args[1] || "2022");
        const limit = args[2] ? parseInt(args[2]) : undefined;

        const sinceDate = new Date(`${sinceYear}-01-01`);
        const discoveryJob = new LaptopDiscoveryJob(icecat, skuRepo, lineRepo);

        await discoveryJob.run(sinceDate, limit);
        break;
      }

      case "sync-prices": {
        const priceSyncJob = new PriceSyncJob(
          skuRepo,
          lineRepo,
          priceRepo,
        );
        await priceSyncJob.run();
        break;
      }

      case "sync-benchmarks": {
        const providers = [notebookcheck];
        const benchmarkSyncJob = new BenchmarkSyncJob(providers, benchmarkRepo);
        await benchmarkSyncJob.run();
        break;
      }

      case "sync-aliases": {
        const aliasSyncJob = new AliasSyncJob(skuRepo, benchmarkRepo, ollama);
        await aliasSyncJob.run();
        break;
      }

      case "repair-data": {
        const repairJob = new RepairJob(skuRepo, lineRepo, ollama);
        await repairJob.run();
        break;
      }

      case "update-value": {
        const suitabilityJob = new SuitabilityJob(skuRepo, workloadRepo);
        await suitabilityJob.run();
        break;
      }

      case "refresh-view": {
        logger.info("Refreshing materialized view: laptop_recommendations...");
        await db`REFRESH MATERIALIZED VIEW laptop_recommendations;`.execute();
        logger.info("View refreshed successfully.");
        break;
      }

      case "sync-workloads": {
        const job = new WorkloadSyncJob(workloadRepo);
        await job.run();
        break;
      }

      case "sync-software": {
        const job = new SoftwareSyncJob(softwareRepo);
        await job.run();
        break;
      }

      case "audit": {
        const auditJob = new AuditJob(auditRepo);
        await auditJob.run();
        break;
      }

      case "init-aliases": {
        logger.info("Initializing alias schema...");
        const { AliasRepository } = await import("./repositories/AliasRepository");
        const aliasRepo = new AliasRepository();
        await aliasRepo.initializeSchema();
        break;
      }

      case "daily-cron": {
        logger.info("Starting daily cron job (Sync Prices -> Refresh View)...");
        const priceSyncJob = new PriceSyncJob(
          skuRepo,
          lineRepo,
          priceRepo,
        );
        await priceSyncJob.run();

        logger.info("Refreshing materialized view: laptop_recommendations...");
        await db`REFRESH MATERIALIZED VIEW laptop_recommendations;`.execute();
        logger.info("Daily cron job completed.");
        break;
      }

      case "weekly-cron": {
        logger.info("Starting weekly maintenance...");
        
        // 1. Discover (Limit to 50 new items to prevent hanging)
        logger.info("Step 1: Discovering new laptops (Limit: 50)...");
        const sinceYear = 2026;
        const sinceDate = new Date(`${sinceYear}-01-01`);
        const discoveryJob = new LaptopDiscoveryJob(icecat, skuRepo, lineRepo);
        await discoveryJob.run(sinceDate, 500);

        // 2. Repair Data (Fix branding/Integrated GPUs)
        logger.info("Step 2: Repairing metadata...");
        const repairJob = new RepairJob(skuRepo, lineRepo, ollama);
        await repairJob.run();

        // 3. Sync Benchmarks
        logger.info("Step 3: Scraping performance benchmarks...");
        const providers = [notebookcheck];
        const benchmarkSyncJob = new BenchmarkSyncJob(providers, benchmarkRepo);
        await benchmarkSyncJob.run();

        // 4. Sync Aliases (Map components to benchmarks)
        logger.info("Step 4: Mapping components to benchmarks...");
        const aliasSyncJob = new AliasSyncJob(skuRepo, benchmarkRepo, ollama);
        await aliasSyncJob.run();

        // 5. Sync Prices (Mock)
        logger.info("Step 5: Generating mock market prices...");
        const priceSyncJob = new PriceSyncJob(skuRepo, lineRepo, priceRepo);
        await priceSyncJob.run();

        // 6. Suitability
        logger.info("Step 6: Updating suitability mappings...");
        const suitabilityJob = new SuitabilityJob(skuRepo, workloadRepo);
        await suitabilityJob.run();

        // 7. Refresh View
        logger.info("Step 7: Refreshing materialized view for application...");
        await db`REFRESH MATERIALIZED VIEW laptop_recommendations;`.execute();

        logger.info("Weekly maintenance completed successfully.");
        break;
      }

      case "ingest-knowledge": {
        // Usage: ingest-knowledge [dir]
        // Default: <repoRoot>/knowledge
        const dir = args[1] || join(import.meta.dir, "../../knowledge");
        const job = new KnowledgeIngestJob(knowledgeRepo, ollama);
        await job.ingestMarkdownDirectory({ dir });
        break;
      }

      case "ingest-db": {
        // Usage: ingest-db [target]
        // Targets:
        //   workloads (default) - workload_requirements rows
        //   software            - software_requirements rows
        const target = (args[1] || "workloads").toLowerCase();
        const job = new DbKnowledgeIngestJob(knowledgeRepo, ollama);

        switch (target) {
          case "workloads":
            await job.ingestWorkloadRequirements();
            break;
          case "software":
            await job.ingestSoftwareRequirements();
            break;
          default:
            throw new Error(`Unknown ingest-db target: ${target}`);
        }

        break;
      }

      case "export-db-docs": {
        // Usage: export-db-docs [target] [outDir]
        // Targets:
        //   workloads (default) - workload_requirements -> markdown
        //   software            - software_requirements -> markdown
        const target = (args[1] || "workloads").toLowerCase();
        const outDir =
          args[2] ||
          join(import.meta.dir, "../../knowledge/db", target);

        const job = new DbDocsExportJob();

        switch (target) {
          case "workloads":
            await job.exportWorkloadRequirements(outDir);
            break;
          case "software":
            await job.exportSoftwareRequirements(outDir);
            break;
          default:
            throw new Error(`Unknown export-db-docs target: ${target}`);
        }

        break;
      }

      default:
        console.log(`
CostOpt Aggregator CLI
----------------------
Available commands:
  discover [year] [limit] - Import laptops updated since [year].
  sync-prices             - Update latest prices from e-commerce.
  sync-benchmarks         - Sync CPU/GPU scores from Notebookcheck.
  sync-aliases            - Use LLM to map generic specs to specific benchmarks.
  repair-data             - Fix reseller branding and identify integrated GPUs.
  update-value            - Map laptops to workloads based on specs and benchmarks.
  refresh-view            - Update the materialized view for the app.
  sync-workloads          - Sync workload definitions to DB.
  sync-software           - Sync software profiles to DB.
  audit                   - Perform a database quality audit.
  init-aliases            - Initialize the aliases DB tables.
  daily-cron              - Run daily maintenance (prices + view refresh).
  weekly-cron             - Run full maintenance (discovery + benchmarks + prices + suitability + view).
  ingest-knowledge [dir]  - Ingest markdown files for RAG (default: ./knowledge).
  ingest-db [target]      - Ingest DB facts for RAG (targets: workloads, software).
  export-db-docs [t] [d]  - Export DB facts to markdown docs (t: workloads, software).
        `);
        process.exit(1);
    }
  } finally {
    await db.close();
  }

  process.exit(0);
};

if (import.meta.main) {
  main().catch((err) => {
    // If the logger isn't available yet, fallback to console, but try logger.fatal
    try {
      const { logger } = require("./utils/logger");
      logger.fatal("Fatal Error during initialization or execution:", err);
    } catch (e) {
      console.error("Fatal Error during initialization or execution:", err);
      process.exit(1);
    }
  });
}
