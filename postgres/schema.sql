-- 1. Product Lines (The Chassis & Subjective Qualities)
-- This table handles brand-wide and line-wide qualities (e.g., "ThinkPad reliability")
CREATE TABLE product_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manufacturer VARCHAR(100) NOT NULL,
    line_name VARCHAR(100) NOT NULL, 
    llm_aggregated_scores JSONB, -- Aggregated scores from all scrapes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (manufacturer, line_name)
);

CREATE INDEX idx_product_lines_scores ON product_lines USING GIN (llm_aggregated_scores);

-- 2. Specific SKUs (The Hardware & Objective Capabilities)
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

-- 3. Workload Requirements (The Bare Minimums)
CREATE TABLE workload_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workload_name VARCHAR(50) UNIQUE NOT NULL, -- e.g., 'web_browsing', 'video_editing'
    min_specs JSONB NOT NULL, -- e.g., '{"ram_gb": 16, "gpu_type": "discrete"}'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. SKU Suitability (The Binary Map)
-- This table is populated by the ETL pipeline based on workload_requirements
CREATE TABLE sku_suitability (
    sku_id UUID REFERENCES laptop_skus(id) ON DELETE CASCADE,
    workload_id UUID REFERENCES workload_requirements(id) ON DELETE CASCADE,
    PRIMARY KEY (sku_id, workload_id)
);

-- 5. Price History
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

-- 6. Raw Scrapes 
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

CREATE INDEX idx_laptop_skus_specs ON laptop_skus USING GIN (hardware_specs);
CREATE INDEX idx_laptop_skus_qualitative ON laptop_skus USING GIN (qualitative_data);

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
    pl.llm_aggregated_scores as line_scores,
    COALESCE(sa.workloads, '[]'::jsonb) as suitable_workloads,
    bd.price_usd as current_price,
    bd.vendor as best_vendor,
    bd.purchase_url,
    bd.is_refurbished,
    ls.updated_at as last_synced
FROM laptop_skus ls
JOIN product_lines pl ON ls.product_line_id = pl.id
LEFT JOIN suitability_agg sa ON ls.id = sa.sku_id
JOIN best_deals bd ON ls.id = bd.laptop_sku_id -- Changed to JOIN to ensure we only show laptops with active prices
WHERE ls.is_active = TRUE;

CREATE INDEX idx_rec_workloads ON laptop_recommendations USING GIN (suitable_workloads);
CREATE INDEX idx_rec_price ON laptop_recommendations (current_price);
CREATE INDEX idx_rec_manufacturer ON laptop_recommendations (manufacturer);
