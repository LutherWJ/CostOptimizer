# CostOpt Database Schema

This document describes the PostgreSQL 16 database schema for the CostOpt project. The database uses a hybrid relational/document approach, utilizing `JSONB` for flexible hardware specifications and qualitative data.

## Core Tables

### 1. `product_lines`
Represents a laptop "chassis" or brand family (e.g., "Dell XPS 13", "Lenovo ThinkPad X1 Carbon"). This level stores qualities that apply to all configurations of that model.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key (auto-generated). |
| `manufact[DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)urer` | VARCHAR | e.g., "Apple", "Dell", "ASUS". |
| `line_name` | VARCHAR | e.g., "MacBook Air", "ROG Zephyrus G14". |
| `created_at` | TIMESTAMP | Record creation time. |
| `updated_at` | TIMESTAMP | Last update time. |

### 2. `laptop_skus`
Represents a specific hardware configuration (SKU) belonging to a product line.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key (auto-generated). |
| `product_line_id` | UUID | Reference to `product_lines.id`. |
| `sku_number` | VARCHAR | Unique manufacturer code (e.g., "9315-XPS-13"). |
| `hardware_specs` | JSONB | Structured specs: CPU, RAM, Storage, Display Res, etc. |
| `qualitative_data` | JSONB | SKU-specific qualitative info (e.g., "OLED Screen Panel Quality"). |
| `is_active` | BOOLEAN | If false, the SKU is hidden from the application. |

### 3. `workload_requirements`
Defines the "Bare Minimum" hardware requirements for specific user activities.

| Column | Type | Description |
| :--- | :--- | :--- |
| `workload_name` | VARCHAR | Unique name (e.g., "video_editing", "3d_modeling"). |
| `min_specs` | JSONB | Minimum RAM, GPU type, etc., required for this workload. |
| `description` | TEXT | Human-readable explanation of the workload. |

### 4. `sku_suitability`
A binary mapping table (Join Table) that links SKUs to the workloads they are capable of handling. Populated by the ETL pipeline.

| Column | Type | Description |
| :--- | :--- | :--- |
| `sku_id` | UUID | Reference to `laptop_skus.id`. |
| `workload_id` | UUID | Reference to `workload_requirements.id`. |

### 5. `price_history`
An append-only table tracking every price update found for a SKU across various vendors.

| Column | Type | Description |
| :--- | :--- | :--- |
| `laptop_sku_id` | UUID | Reference to `laptop_skus.id`. |
| `vendor` | VARCHAR | e.g., "Amazon", "eBay", "BestBuy". |
| `price_usd` | NUMERIC | The listed price. |
| `purchase_url` | TEXT | Direct link to the listing. |
| `is_refurbished` | BOOLEAN | Differentiates New vs Refurbished deals. |
| `recorded_at` | TIMESTAMP | When this price was scraped. |

### 6. `component_benchmarks`
Stores generic performance scores for CPUs and GPUs.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key. |
| `component_name` | VARCHAR | Canonical name (e.g. "Intel Core i7-12700H"). |
| `component_type` | VARCHAR | 'CPU' or 'GPU'. |
| `benchmark_score` | INTEGER | Generic performance score. |
| `extra_data` | JSONB | Flexible storage for other metrics. |

### 7. `component_aliases`
Maps various scraped name variations to a single canonical benchmark entry.

| Column | Type | Description |
| :--- | :--- | :--- |
| `alias_name` | VARCHAR | Messy name found in the wild. |
| `canonical_name` | VARCHAR | Reference to `component_benchmarks.component_name`. |

---

## Application Layer (Read Optimized)

### Materialized View: `laptop_recommendations`
The application team should primarily query this view. It flattens the relational structure and provides a "Best Deal" (lowest price) snapshot for every SKU, separated by **New** vs **Refurbished** condition.

**Key Queryable Columns:**
- `recommendation_id`: A unique hash for the SKU+Condition pair.
- `suitable_workloads`: A JSONB array (e.g., `["web_browsing", "photo_editing"]`).
- `current_price`: The lowest available price for that SKU in that condition.
- `best_vendor`: The vendor providing that lowest price.
- `is_refurbished`: Filter by condition.
- `cpu_score`: Benchmark score for the CPU.
- `gpu_score`: Benchmark score for the GPU.
- `value_score`: A calculated metric representing cost-effectiveness based on performance (CPU/GPU) and storage relative to price.

**Query Example:**
```sql
-- Get the best deal for a laptop suitable for 4K Video Editing under $1500
-- sorted by performance (CPU score).
SELECT * FROM laptop_recommendations
WHERE suitable_workloads @> '["video_editing_4k"]'
AND current_price < 1500
ORDER BY cpu_score DESC;
```

---

## Maintenance
To update the application data after the ETL pipeline finishes:
```sql
REFRESH MATERIALIZED VIEW laptop_recommendations;
```
