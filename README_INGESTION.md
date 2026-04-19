# Ingestion Guide (Docs + DB + RAG)

This project supports a source-grounded support bot and filtering by ingesting:
- Markdown documents under `knowledge/` (RAG)
- Selected database facts (workloads/software profiles) into the RAG store
- Software compatibility profiles into Postgres for filtering in `laptop_recommendations`

## Prereqs

- Bun installed (`bun --version`)
- Postgres reachable (the Proxmox DB you use for the app)
- Ollama reachable (for chat + embeddings), e.g. `http://10.33.86.71:11434`

## Environment variables

The code reads from `process.env`. In practice:
- Copy `aggregator/.env.example` -> `aggregator/.env` and fill in the real values
- Put runtime env vars in `application/.env` (same DB + Ollama vars)
- Avoid setting a placeholder `DATABASE_URL` in your shell; the DB connection prefers `DATABASE_URL` if present.

Minimum DB vars (used by `aggregator/src/repositories/connection.ts`):
- `POSTGRES_HOSTNAME`
- `POSTGRES_PORT`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`

Optional DB TLS vars (only if your Postgres requires SSL/TLS):
- `POSTGRES_TLS` (`true`/`false`)
- `POSTGRES_TLS_INSECURE` (`true` to accept self-signed certs; LAN/dev only)

Minimum Ollama vars (used by `aggregator/src/extractors/OllamaService.ts`):
- `OLLAMA_HOSTNAME` + `OLLAMA_PORT` (or `OLLAMA_URL`)
- Optional: `OLLAMA_MODEL` (chat) and `OLLAMA_EMBED_MODEL` (embeddings; default `nomic-embed-text:latest`)

Optional RAG tuning (application):
- `RAG_MIN_SIMILARITY` (default `0.35`) - if retrieval is less similar than this, the bot will say it can't find it in current compatibility info instead of guessing.
- `SUPPORT_CHAT_MAX_CHARS` (default `350`) - hard limit for the bot's reply length.
- `RAG_MAX_CONTEXT_CHARS` (default `6000`) - hard limit for total internal context sent to the LLM.
- `RAG_MAX_EXTRA_CONTEXT_CHARS` (default `2200`) - limit for structured DB notes (software/workloads) within the context.
- `SOFTWARE_FUZZY_AUTO_THRESHOLD` (default `0.52`) - trigram similarity threshold to auto-resolve misspellings (higher = stricter).
- `SOFTWARE_FUZZY_AMBIGUOUS_DELTA` (default `0.05`) - if the top two matches are closer than this, the bot won’t guess.

Optional Ollama response limit (reduces timeouts):
- `OLLAMA_NUM_PREDICT` (or `OLLAMA_MAX_TOKENS`) - max tokens to generate per response.
- `OLLAMA_TIMEOUT_MS` - abort an Ollama request if it exceeds this time (default `60000` ms).

PowerShell tip (terminal chat):
- If pasted text looks garbled, re-run `tools/support-chat.ps1` (it forces UTF-8 input/output best-effort).

## One-time setup (per database)

1) Apply/upgrade schema (creates RAG tables + software tables/view changes)
- `cd aggregator`
- `bun run migrate`

2) Sync workload definitions into DB
- `bun run src/index.ts sync-workloads`

3) Sync software profiles into DB (initial set lives in `aggregator/src/config/software.ts`)
- `bun run src/index.ts sync-software`

4) Refresh the materialized view (required for app filtering)
- `bun run src/index.ts refresh-view`

## Editing knowledge docs (Markdown)

1) Add or edit `*.md` files anywhere under `knowledge/` (recursive):
- Examples: `knowledge/software/`, `knowledge/programs/`, `knowledge/policies/`
- Tip: add “how to decide” docs under `knowledge/guides/` (budget upgrades, Mac vs Windows, tradeoffs).

2) Ingest Markdown into the vector store (writes to `knowledge_documents` + `knowledge_chunks`)
- `cd aggregator`
- `bun run src/index.ts ingest-knowledge`

## Ingest DB facts into the vector store (RAG)

These commands embed DB rows into `knowledge_documents`/`knowledge_chunks` so the support bot can retrieve them semantically.

- Workload requirements:
  - `cd aggregator`
  - `bun run src/index.ts ingest-db workloads`
- Software profiles:
  - `cd aggregator`
  - `bun run src/index.ts ingest-db software`

## Export DB facts to Markdown (optional)

This creates human-readable docs under `knowledge/db/...` (useful for review/versioning).

- Workloads:
  - `cd aggregator`
  - `bun run src/index.ts export-db-docs workloads`
  - Output: `knowledge/db/workloads/`
- Software:
  - `cd aggregator`
  - `bun run src/index.ts export-db-docs software`
  - Output: `knowledge/db/software/`

## Testing

### 1) Support bot API (RAG)

1) Start the web app:
- `cd application`
- `bun run src/index.ts`

Notes:
- Default is `http://localhost:3000` (override with `http_server_port`).
- If you're using `docker-compose`, the host port is `3001` (see `docker-compose.yml`).

2) Call the endpoint:
- `POST http://localhost:3000/api/support/chat`
- Body example:
  - `{"message":"What are the minimum specs for Office Productivity?","topK":8}`

Expected (default): JSON with `{ "answer": "..." }` (no citations, no sources).

Optional debug (shows retrieved chunks + distances):
- `POST http://localhost:3000/api/support/chat?debug=1`
- Body example:
  - `{"message":"What are the minimum specs for Office Productivity?","topK":8,"debug":true}`

PowerShell example:
- `Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/support/chat" -ContentType "application/json" -Body (@{ message="What are the minimum specs for Office Productivity?"; topK=8 } | ConvertTo-Json)`

Interactive terminal chat (PowerShell):
- Start the server, then run: `powershell -ExecutionPolicy Bypass -File tools/support-chat.ps1`

### 2) Results filtering by software

The recommendations query supports `software=<comma-separated keys>`:
- Example:
  - `http://localhost:3000/recommend?workloads=office&software=m365&budget=any&size=any`

Note: `laptop_recommendations` must have data (prices + suitability) for results to appear.
