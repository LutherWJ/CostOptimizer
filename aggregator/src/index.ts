import { IcecatService } from "./extractors/icecat";
import { EbayService } from "./extractors/ebay";
import {
  LaptopSkuRepository,
  ProductLineRepository,
  PriceHistoryRepository,
  ComponentBenchmarkRepository,
  db,
} from "./repositories";
import { LaptopDiscoveryJob } from "./jobs/LaptopDiscoveryJob";
import { PriceSyncJob } from "./jobs/PriceSyncJob";
import { BenchmarkSyncJob } from "./jobs/BenchmarkSyncJob";
import { NotebookcheckExtractor } from "./extractors/notebookcheck";

const main = async () => {
  const args = process.argv.slice(2);
  const command = args[0];

  // Initialize Repositories
  const skuRepo = new LaptopSkuRepository();
  const lineRepo = new ProductLineRepository();
  const priceRepo = new PriceHistoryRepository();
  const benchmarkRepo = new ComponentBenchmarkRepository();

  // Initialize Services
  const icecat = new IcecatService();
  const ebay = new EbayService();
  const notebookcheck = new NotebookcheckExtractor();

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
        const providers = [ebay];
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

      case "refresh-view": {
        console.log("Refreshing materialized view: laptop_recommendations...");
        await db`REFRESH MATERIALIZED VIEW laptop_recommendations;`.execute();
        console.log("View refreshed successfully.");
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
  refresh-view            - Update the materialized view for the app.
        `);
        process.exit(1);
    }
  } finally {
    await db.close();
  }

  process.exit(0);
};

main().catch((err) => {
  console.error("Fatal Error during initialization:", err);
  process.exit(1);
});
