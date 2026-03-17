# CostOpt Aggregator: ETL Pipeline Documentation

The `aggregator` service is a Bun-based ETL (Extract, Transform, Load) pipeline responsible for populating the CostOpt database. It discovery new hardware, synchronizes market pricing, fetches performance benchmarks, and calculates suitability scores for user workloads.

## ETL Architecture

The pipeline follows a strict **Extractor -> Transformer -> Repository** pattern, coordinated by **Jobs**.

### 1. Extraction (Source Data)
Located in `src/extractors/`, these services interact with external APIs or scrape raw data.

- **`IcecatService`**: Fetches structured hardware specifications (RAM, CPU, GPU, Storage) via the Icecat XML index and product APIs.
- **`EbayService`**: Searches for live market listings to find the latest prices for specific laptop SKUs (New & Refurbished).
- **`NotebookcheckExtractor`**: Scrapes mobile CPU and GPU benchmark lists to provide performance context.

### 2. Transformation (Business Logic)
Located in `src/transformers/`, these classes are responsible for validation, cleaning, and normalization. They ensure the database receives clean, canonical data.

- **`HardwareSpecsTransformer`**: Validates raw Icecat data against our `hardwareSpecsSchema` (Zod) and canonicalizes manufacturer/brand names.
- **`BenchmarkTransformer`**: Normalizes benchmark scores and maps them to canonical component names.
- **`PriceTransformer`**: Prepares price records for storage, ensuring currency and condition consistency.
- **`SuitabilityTransformer`**: Evaluates if a SKU meets the "Bare Minimum" specs for a specific workload (e.g., 4K Video Editing requires 32GB RAM + Discrete GPU).

### 3. Loading (Persistence)
Located in `src/repositories/`, these classes handle all database interactions using `bun:sql`.

- **`LaptopSkuRepository`**: Manages `laptop_skus` and `sku_suitability` join tables.
- **`ProductLineRepository`**: Manages the high-level chassis/brand groups.
- **`PriceHistoryRepository`**: Appends new price points to track fluctuations over time.
- **`ComponentBenchmarkRepository`**: Maintains a lookup table of CPU/GPU performance scores.

---

## Database Population Process

The full population process consists of several stages, typically run in this order:

### Stage 1: Discovery (`bun run src/index.ts discover [year]`)
- **Extractor**: `IcecatService` fetches the latest index.
- **Transformer**: `HardwareSpecsTransformer` validates each item.
- **Repo**: `LaptopSkuRepository` creates new entries for previously unseen SKUs.
- **Result**: `laptop_skus` table is populated with baseline specs.

### Stage 2: Performance Sync (`bun run src/index.ts sync-benchmarks`)
- **Extractor**: `NotebookcheckExtractor` scrapes the latest performance lists.
- **Transformer**: `BenchmarkTransformer` normalizes the scores.
- **Repo**: `ComponentBenchmarkRepository` updates the benchmark lookup table.
- **Result**: `component_benchmarks` is updated, enabling the application to rank laptops by performance.

### Stage 3: Pricing Sync (`bun run src/index.ts sync-prices`)
- **Extractor**: `EbayService` (and others) searches for active SKUs.
- **Transformer**: `PriceTransformer` maps listings to our internal SKUs.
- **Repo**: `PriceHistoryRepository` adds new records.
- **Result**: The system now has real-world price points to calculate "Value".

### Stage 4: Suitability Mapping (`bun run src/index.ts suitability`)
- **Transformer**: `SuitabilityTransformer` compares every SKU's specs + benchmarks against the definitions in `src/config/workloads.ts`.
- **Repo**: `LaptopSkuRepository` updates the `sku_suitability` join table.
- **Result**: Laptops are now tagged as "Suitable" for specific user activities.

### Stage 5: Materialized View Refresh (`bun run src/index.ts refresh-view`)
- **SQL**: Executes `REFRESH MATERIALIZED VIEW laptop_recommendations;`.
- **Logic**: This flattens all the above data into a single, high-performance table for the frontend. It also calculates the final `value_score` using: `((CPU + GPU + Storage*10) / Price)`.

---

## Configuration

- **Workload Definitions**: Modify `src/config/workloads.ts` to change the minimum requirements for different user activities.
- **Validation**: Modify `src/models/hardwareSpecsSchema.ts` to adjust the required fields for incoming hardware data.
