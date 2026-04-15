-- Product Lines 
CREATE TABLE product_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manufacturer VARCHAR(100) NOT NULL,
    line_name VARCHAR(100) NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (manufacturer, line_name)
);

-- Specific SKUs 
CREATE TABLE laptop_skus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_line_id UUID REFERENCES product_lines(id) ON DELETE CASCADE,
    sku_number VARCHAR(100) UNIQUE NOT NULL,
    hardware_specs JSONB NOT NULL, 
    qualitative_data JSONB, -- SKU-specific qualitative data (e.g., "OLED Screen Quality")
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Workload Requirements (The Bare Minimums)
CREATE TABLE workload_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workload_name VARCHAR(50) UNIQUE NOT NULL, -- e.g., 'web_browsing', 'video_editing'
    min_specs JSONB NOT NULL, -- e.g., '{"ram_gb": 16, "gpu_type": "discrete"}'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Maps laptop models to workloads they've been deemed suitable for
CREATE TABLE sku_suitability (
    sku_id UUID REFERENCES laptop_skus(id) ON DELETE CASCADE,
    workload_id UUID REFERENCES workload_requirements(id) ON DELETE CASCADE,
    PRIMARY KEY (sku_id, workload_id)
);

-- An append-only table to track price fluctuations over time.
CREATE TABLE price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    laptop_sku_id UUID REFERENCES laptop_skus(id) ON DELETE CASCADE,
    vendor VARCHAR(50) NOT NULL, -- e.g., "Amazon", "Ebay"
    price_usd NUMERIC(10, 2) NOT NULL,
    purchase_url TEXT NOT NULL,
    is_refurbished BOOLEAN DEFAULT FALSE,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Stores unprocessed text data from scraped review sites
CREATE TABLE raw_scrapes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_line_id UUID REFERENCES product_lines(id) ON DELETE SET NULL,
    source_url TEXT NOT NULL,
    source_platform VARCHAR(50) NOT NULL, -- e.g., "iFixit", "Notebookcheck"
    raw_text_content TEXT,
    llm_parsed_json JSONB,
    scraped_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    parsed_at TIMESTAMP WITH TIME ZONE
);





-- Enable fuzzy matching extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Component Benchmarks (Lookup table for CPUs and GPUs)
CREATE TABLE component_benchmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    component_name VARCHAR(255) UNIQUE NOT NULL, -- Canonical Name
    component_type VARCHAR(50) NOT NULL,        -- 'CPU' or 'GPU'
    benchmark_score INTEGER,                     -- Generic performance score (e.g. PassMark)
    extra_data JSONB,                            -- Flexible storage for other metrics (Cinebench, etc.)
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Component Aliases (Mapping messy scraped names to canonical benchmark names)
CREATE TABLE component_aliases (
    alias_name VARCHAR(255) PRIMARY KEY,
    canonical_name VARCHAR(255) REFERENCES component_benchmarks(component_name) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- 7. Materialized View for Application Layer
-- This view flattens the complex relationships into a single table for fast frontend reads.
-- It identifies the absolute "Best Deal" (lowest price) for New vs Refurbished for every active SKU.
CREATE MATERIALIZED VIEW laptop_recommendations AS
WITH latest_prices AS (
    -- Get the most recent price from every vendor for every SKU, separating New vs Refurbished
    SELECT DISTINCT ON (laptop_sku_id, vendor, is_refurbished)
        laptop_sku_id,
        vendor,
        price_usd,
        purchase_url,
        is_refurbished,
        recorded_at
    FROM price_history
    ORDER BY laptop_sku_id, vendor, is_refurbished, recorded_at DESC
),
best_deals AS (
    -- Of those latest prices, pick the single cheapest one for EACH condition (New vs Refurbished)
    SELECT DISTINCT ON (laptop_sku_id, is_refurbished)
        laptop_sku_id,
        vendor,
        price_usd,
        purchase_url,
        is_refurbished
    FROM latest_prices
    ORDER BY laptop_sku_id, is_refurbished, price_usd ASC
),
suitability_agg AS (
    -- Group all suitable workloads into a single JSON array
    SELECT
        sku_id,
        jsonb_agg(wr.workload_name) as workloads
    FROM sku_suitability ss
    JOIN workload_requirements wr ON ss.workload_id = wr.id
    GROUP BY sku_id
)
SELECT
    -- Create a unique ID for the view (SKU + Condition)
    md5(ls.id::text || bd.is_refurbished::text) as recommendation_id,
    ls.id as sku_id,
    pl.manufacturer,
    pl.line_name,
    ls.sku_number,
    ls.hardware_specs,
    ls.qualitative_data,
    COALESCE(sa.workloads, '[]'::jsonb) as suitable_workloads,
    bd.price_usd as current_price,
    bd.vendor as best_vendor,
    bd.purchase_url,
    bd.is_refurbished,
    ls.updated_at as last_synced,
    -- Add Benchmark Scores
    cpu.benchmark_score as cpu_score,
    gpu.benchmark_score as gpu_score,
    -- Add Value Score
    -- Formula: ((CPU Score + GPU Score) / Price)
    (
        (COALESCE(cpu.benchmark_score, 0) +
         COALESCE(gpu.benchmark_score, 0) +
         (COALESCE((ls.hardware_specs->>'storage_gb')::numeric, 0) * 10))
            / NULLIF(bd.price_usd, 0)
        ) as value_score
FROM laptop_skus ls
         JOIN product_lines pl ON ls.product_line_id = pl.id
         LEFT JOIN suitability_agg sa ON ls.id = sa.sku_id
         JOIN best_deals bd ON ls.id = bd.laptop_sku_id
-- Join for CPU Benchmarks
         LEFT JOIN component_aliases ca_cpu ON ca_cpu.alias_name = ls.hardware_specs->>'cpu_family'
    LEFT JOIN component_benchmarks cpu ON cpu.component_name = COALESCE(ca_cpu.canonical_name, ls.hardware_specs->>'cpu_family')
-- Join for GPU Benchmarks
    LEFT JOIN component_aliases ca_gpu ON ca_gpu.alias_name = ls.hardware_specs->>'gpu_model'
    LEFT JOIN component_benchmarks gpu ON gpu.component_name = COALESCE(ca_gpu.canonical_name, ls.hardware_specs->>'gpu_model')
WHERE ls.is_active = TRUE;

CREATE INDEX idx_rec_workloads ON laptop_recommendations USING GIN (suitable_workloads);
CREATE INDEX idx_rec_price ON laptop_recommendations (current_price);
CREATE INDEX idx_rec_manufacturer ON laptop_recommendations (manufacturer);
CREATE INDEX idx_benchmark_type ON component_benchmarks(component_type);
CREATE INDEX idx_alias_canonical ON component_aliases(canonical_name);
CREATE INDEX idx_laptop_skus_specs ON laptop_skus USING GIN (hardware_specs);
CREATE INDEX idx_laptop_skus_qualitative ON laptop_skus USING GIN (qualitative_data);

