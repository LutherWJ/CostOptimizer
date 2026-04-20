# Aggregator Deep Dive: The Data Engineering Engine

## 1. The Core Design Pattern: The ETL Pipeline
The Aggregator is not a "web server." It is a **Data Pipeline**. Its goal is to take "Untrusted, Messy Data" and turn it into "Trusted, Normalized Data." 

We use a strict **Extractor -> Transformer -> Repository** architecture. Each step has a single, non-negotiable responsibility.

### The "How": Extractors (`Extractor` Pattern)
An Extractor’s sole job is to fetch raw data. It does not know how to clean it, and it does not know where to save it.
*   **Design Principle: Strategy Pattern**. Whether we're fetching XML from Icecat, scraping HTML from eBay, or using the Ollama LLM to parse reviews, each source follows a consistent strategy but uses its own internal logic.
*   **Benefit**: If eBay changes its website layout, you only have to touch the `EbayService`. The rest of the pipeline remains perfectly safe.

### The "What": Transformers (`Validation` Pattern)
The Transformer is the most critical part of the system. It acts as the "Gatekeeper."
*   **Zod Schemas**: We use a library called **Zod** to define exactly what a "Valid Laptop" looks like. If a laptop is missing its CPU name or its RAM amount, the Transformer will reject it immediately.
*   **Normalization**: This step converts "Intel Core i7-1355U" into its canonical form. It removes marketing fluff like "Ultra-fast" and ensures that "16GB" always becomes the number `16`.
*   **Design Principle: Single Responsibility**. The Transformer doesn't care *where* the data came from (Extractor) or *where* it's going (Repository). It only cares about the **Integrity** of the data.

### The "Where": Repositories (`Persistence` Pattern)
Repositories are the only files allowed to talk to the database. They encapsulate all SQL.
*   **Design Principle: Encapsulation**. Instead of writing SQL in your business logic, you call `skuRepo.create(laptop)`.
*   **Benefit**: This means our logic is "Database-Agnostic." If we decided to switch from PostgreSQL to SQLite, we would only have to update the Repositories.

---

## 2. Orchestration: The Job Pattern
To manage these pipelines, we use **Jobs**. A Job is an orchestrator that says: "Hey Extractor, go get the laptops. Hey Transformer, go clean them. Hey Repository, go save them."

### The "Big Picture" Jobs:
1.  **`LaptopDiscoveryJob`**: Scans for new models. This is our "Growth" engine.
2.  **`PriceSyncJob`**: Scans eBay/Amazon for new prices. This is our "Market" engine.
3.  **`SuitabilityJob`**: The most complex job. It compares every laptop against the definitions in `workloads.ts` (e.g., "Must have 16GB RAM for Data Science").

---

## 3. The "Cognitive" Layer: Ollama & Local LLMs
A unique feature of this project is the use of **Local LLMs** (via Ollama) for **Cognitive Data Repair**.
*   **The Problem**: Sometimes data is messy. A laptop listing might say "i7, 16gb, 512, fast." This is hard for a standard regex to parse.
*   **The Solution**: We send this text to a local LLM with a prompt: "Extract the CPU, RAM, and Storage as JSON."
*   **Architectural Benefit**: By running this locally, we have zero API costs and zero data privacy concerns. It’s an "Autonomous Agent" inside our pipeline.

---

## 4. Logic Deep Dive: The Suitability Mapper
This is the "Brain" of the project. How do we decide if a laptop is "good" for a user?
1.  **Workload Definitions**: We define a "Bare Minimum" for every activity (e.g., "AAA Gaming" needs a GPU score > 12,000 and RAM > 16GB).
2.  **The Comparator**: We compare the laptop's actual specs against the minimums.
3.  **Benchmark Scaling**: We scale CPU/GPU scores from 0 to 30,000 to match the "Workload Thresholds."
4.  **Materialization**: The results are saved in a many-to-many table (`sku_suitability`).

---

## 5. Summary of Design Patterns
*   **Extractor -> Transformer -> Repository**: The ETL Pipeline.
*   **Strategy Pattern**: For multi-source data extraction.
*   **Repository Pattern**: For database abstraction.
*   **Facade Pattern (Jobs)**: For orchestrating complex multi-step processes.

## 6. How to Refactor or Scale
*   **Scaling Up**: If we have 1,000,000 laptops, we can run multiple `LaptopDiscoveryJob` processes in parallel because they are "Stateless."
*   **Adding Features**: To add "Carbon Footprint" data, you would:
    1.  Add a new `CarbonExtractor`.
    2.  Update the `HardwareSpecsTransformer` to validate carbon data.
    3.  Add a column to the database via the Repository.
    4.  The rest of the system (Price sync, suitability, UI) remains untouched.
