# CostOpt Aggregator: ETL Pipeline Documentation

The `aggregator` service is a Bun-based ETL (Extract, Transform, Load) pipeline responsible for populating the CostOpt database. It discovery new hardware, synchronizes market pricing, fetches performance benchmarks, and calculates suitability scores for user workloads.

## ETL Architecture

The pipeline follows a strict **Extractor -> Transformer -> Repository** pattern, coordinated by **Jobs**.

### 1. Extraction (Source Data)
Located in `src/extractors/`, these services interact with external APIs or scrape raw data.

- **`IcecatService`**: Fetches structured hardware specifications (RAM, CPU, GPU, Storage) via the Icecat XML index and product APIs.
- **`EbayService`**: Searches for live market listings to find the latest prices for specific laptop SKUs on eBay.
- **`SerpApiService`**: Integrates Google Shopping search results via SerpApi for a broader view of market pricing.
- **`NotebookcheckExtractor`**: Scrapes mobile CPU and GPU benchmark lists to provide performance context.
- **`OllamaService`**: A wrapper for the local LLM server used for structured parsing, alias mapping, and data repair.

### 2. Transformation (Business Logic)
Located in `src/transformers/`, these classes are responsible for validation, cleaning, and normalization.

- **`HardwareSpecsTransformer`**: Validates raw Icecat data against our `hardwareSpecsSchema` (Zod) and canonicalizes manufacturer/brand names.
- **`BenchmarkTransformer`**: Normalizes benchmark scores and maps them to canonical component names.
- **`ProductMatcher`**: Implements a sophisticated **3-Tier Matching Strategy** to link external listings to internal SKUs:
  1. **Cache Lookups**: Instant match for previously seen strings.
  2. **Fuzzy String Matching**: High-confidence matching for minor name variations.
  3. **LLM Verification**: Final fallback using Ollama to resolve ambiguous or complex hardware descriptions.
- **`PriceTransformer`**: Prepares price records for storage, ensuring currency and condition consistency.
- **`SuitabilityTransformer`**: Evaluates if a SKU meets the "Bare Minimum" specs for a specific workload (e.g., 4K Video Editing requires 32GB RAM + Discrete GPU).

### 3. Loading (Persistence)
Located in `src/repositories/`, these classes handle all database interactions using `bun:sql`.

- **`LaptopSkuRepository`**: Manages `laptop_skus` and `sku_suitability` join tables.
- **`ProductLineRepository`**: Manages the high-level chassis/brand groups.
- **`PriceHistoryRepository`**: Appends new price points to track fluctuations over time.
- **`ComponentBenchmarkRepository`**: Maintains a lookup table of CPU/GPU performance scores.
- **`AliasRepository`**: Stores mapping between raw hardware strings and canonical component names.
- **`WorkloadRepository`**: Manages definitions of user workload requirements.
- **`AuditRepository`**: Tracks the results of data quality checks and repairs.

---

## Database Population Process

The population process includes maintenance and repair stages to ensure high data quality:

### Stage 1: Discovery (`bun run src/index.ts discover [year]`)
- **Extractor**: `IcecatService` fetches the latest index.
- **Repo**: `LaptopSkuRepository` creates new entries for previously unseen SKUs.

### Stage 2: Performance Sync (`bun run src/index.ts sync-benchmarks`)
- **Extractor**: `NotebookcheckExtractor` scrapes the latest performance lists.
- **Repo**: `ComponentBenchmarkRepository` updates the benchmark lookup table.

### Stage 3: Alias Normalization (`bun run src/index.ts sync-aliases`)
- **Job**: `AliasSyncJob` uses LLMs to map messy hardware names in the database to canonical benchmark names.
- **Repo**: `AliasRepository` stores the learned mappings.

### Stage 4: Pricing Sync (`bun run src/index.ts sync-prices`)
- **Extractors**: `EbayService` and `SerpApiService` (Google Shopping) search for active SKUs.
- **Transformer**: `ProductMatcher` uses the 3-tier strategy to link prices to internal SKUs.
- **Repo**: `PriceHistoryRepository` adds new records.

### Stage 5: Data Repair & Auditing (`bun run src/index.ts audit --repair`)
- **Job**: `AuditJob` scans for data quality issues (e.g., mismatched brand names, missing key specs).
- **Job**: `RepairJob` uses LLM-driven heuristics to fix missing or incorrect data identified during the audit.

### Stage 6: Suitability Mapping (`bun run src/index.ts suitability`)
- **Transformer**: `SuitabilityTransformer` compares every SKU's specs + benchmarks against the definitions in `src/config/workloads.ts`.
- **Repo**: `LaptopSkuRepository` updates the `sku_suitability` join table.

### Stage 7: Materialized View Refresh (`bun run src/index.ts refresh-view`)
- **SQL**: Executes `REFRESH MATERIALIZED VIEW laptop_recommendations;`.
- **Logic**: Flattens all data and calculates final `value_score`.

---

## Configuration

- **Workload Definitions**: Modify `src/config/workloads.ts` to change the minimum requirements for different user activities.
- **Validation**: Modify `src/models/hardwareSpecsSchema.ts` to adjust the required fields for incoming hardware data.
