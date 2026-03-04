-- 1. Product Lines (The Chassis & Subjective Qualities)
-- This table handles brand-wide and line-wide qualities (e.g., "ThinkPad reliability")
CREATE TABLE product_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manufacturer VARCHAR(100) NOT NULL,
    line_name VARCHAR(100) NOT NULL, 
    llm_aggregated_scores JSONB, -- e.g., '{"build_quality": 8.5, "keyboard_feel": 9.0}'
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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
