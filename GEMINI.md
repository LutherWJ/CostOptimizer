# CostOpt Project Overview

CostOpt is an application designed to help non-technical users find the best laptop deals based on their specific workloads (e.g., photo editing, 3D modeling, web browsing). It uses a combination of structured hardware specifications (from Icecat), market pricing (from eBay/Amazon/BestBuy), and qualitative data parsed from reviews using LLMs.

## Architecture

The project is structured as a monorepo with the following components:

- **`aggregator/`**: A Bun-based service responsible for data ingestion (ETL).
  - Fetches hardware specs from Icecat.
  - Scrapes pricing data from various vendors.
  - Parses qualitative review data from publications like Notebookcheck and RTINGS.
  - Maps laptops to "Workload Requirements" using a binary suitability model.
- **`application/`**: A Bun/Hono web application.
  - **HTMX + Hono JSX**: Uses Hono's JSX-to-HTML for server-side rendering with **HTMX** for frontend interactivity.
  - Provides a non-technical interface for users to select workloads and view recommended laptops.
- **`postgres/`**: Contains the database schema (`schema.sql`).
  - Uses a hybrid Relational/JSONB approach for structured specs and flexible qualitative data.
- **Infrastructure**: Managed via `docker-compose.yml`, including a Postgres database and an Ollama LLM server.

## Key Technologies

- **Runtime**: [Bun](https://bun.sh/)
- **Frontend/Backend Web**: [Hono](https://hono.dev/) with [HTMX](https://htmx.org/) for dynamic UI updates without a heavy JS framework.
- **Database**: PostgreSQL 16 (with JSONB for flexible hardware and qualitative data).
- **Validation**: [Zod](https://zod.dev/) for hardware spec schemas.
- **LLM**: Ollama for parsing raw text scrapes into structured JSON.

## Database Schema Highlights

- **`product_lines`**: Chassis and brand-level qualitative data.
- **`laptop_skus`**: Specific hardware configurations, linked to product lines. Includes `hardware_specs` and `qualitative_data` as JSONB.
- **`workload_requirements`**: Defines "Bare Minimum" specs for different user activities.
- **`sku_suitability`**: A binary join table mapping SKUs to workloads they are capable of handling.
- **`price_history`**: Tracking price fluctuations across vendors.

## Development Commands

### Building and Running (Local)

Most components use Bun. Ensure you have Bun installed.

- **Install Dependencies**: `bun install` (at root or in subdirectories).
- **Run Aggregator**: `cd aggregator && bun run src/index.ts`
- **Run Web App**: `cd application && bun run src/index.ts`

### Docker Deployment

- **Start Services**: `docker-compose up -d`
- **Stop Services**: `docker-compose down`

## Workload Definitions

Workload requirements are defined in `aggregator/src/config/workloads.ts`. These definitions determine which laptops are marked as "Suitable" for specific user types.

## Data Pipeline Frequency

- **Daily**: Price and availability updates (eBay, Amazon).
- **Bi-Weekly/Monthly**: New model ingestion (Icecat) and qualitative data scraping.
- **On-Demand**: Re-running the "Suitability Mapper" when workload definitions or hardware specs change.
