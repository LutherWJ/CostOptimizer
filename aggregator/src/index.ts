import { IcecatService } from "./extractors/icecat";
import { SerpApiService } from "./extractors/serpapi";
import {
  LaptopSkuRepository,
  ProductLineRepository,
  PriceHistoryRepository,
  ComponentBenchmarkRepository,
  WorkloadRepository,
  db,
} from "./repositories";
import { LaptopDiscoveryJob } from "./jobs/LaptopDiscoveryJob";
import { PriceSyncJob } from "./jobs/PriceSyncJob";
import { BenchmarkSyncJob } from "./jobs/BenchmarkSyncJob";
import { SuitabilityJob } from "./jobs/SuitabilityJob";
import { NotebookcheckExtractor } from "./extractors/notebookcheck";
import { OllamaService } from "./extractors/OllamaService";
import { AliasSyncJob } from "./jobs/AliasSyncJob";
import { logger } from "./utils/logger";

const main = async () => {
  const args = process.argv.slice(2);
  const command = args[0];

  // Initialize Repositories
  const skuRepo = new LaptopSkuRepository();
  const lineRepo = new ProductLineRepository();
  const priceRepo = new PriceHistoryRepository();
  const benchmarkRepo = new ComponentBenchmarkRepository();
  const workloadRepo = new WorkloadRepository();

  // Initialize Services
  const icecat = new IcecatService();
  const serpapi = new SerpApiService();
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
        const providers = [serpapi];
        const priceSyncJob = new PriceSyncJob(
          providers,
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

      case "init-aliases": {
        logger.info("Initializing alias schema...");
        const { AliasRepository } = await import("./repositories/AliasRepository");
        const aliasRepo = new AliasRepository();
        await aliasRepo.initializeSchema();
        break;
      }

      case "daily-cron": {
        logger.info("Starting daily cron job (Sync Prices -> Refresh View)...");
        const providers = [serpapi];
        const priceSyncJob = new PriceSyncJob(
          providers,
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
        logger.info("Starting discover step");
        // Discover
        const sinceYear = 2022;
        const sinceDate = new Date(`${sinceYear}-01-01`);
        const discoveryJob = new LaptopDiscoveryJob(icecat, skuRepo, lineRepo);
        await discoveryJob.run(sinceDate);

        // Sync Benchmarks
        logger.info("Starting benchmark scraping");
        const providers = [notebookcheck];
        const benchmarkSyncJob = new BenchmarkSyncJob(providers, benchmarkRepo);
        await benchmarkSyncJob.run();

        logger.info("Starting value processing");
        // Suitability
        const suitabilityJob = new SuitabilityJob(skuRepo, workloadRepo);
        await suitabilityJob.run();

        logger.info("Weekly cron job completed.");
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
  update-value            - Map laptops to workloads based on specs and benchmarks.
  refresh-view            - Update the materialized view for the app.
  init-aliases            - Initialize the aliases DB tables.
  daily-cron              - Run daily maintenance (prices + view refresh).
  weekly-cron             - Run weekly maintenance (discovery + benchmarks + value).
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
