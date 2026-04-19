# Knowledge Base (RAG)

Drop Markdown files in this folder to make them searchable by the support bot.

- Add content as `*.md` files (headings, lists, links, and tables work well).
- Organize into subfolders (the ingester scans recursively), for example:
  - `knowledge/software/` (app requirements, compatibility notes)
  - `knowledge/programs/` (major/program-specific requirements)
  - `knowledge/policies/` (IT policies, purchasing rules)
  - `knowledge/guides/` (how-to-decide guidance and tradeoffs)
- Run ingestion: `cd aggregator && bun run src/index.ts ingest-knowledge`
- Ingest DB facts (recommended for compatibility rules): `cd aggregator && bun run src/index.ts ingest-db workloads`
- Ingest DB software profiles: `cd aggregator && bun run src/index.ts ingest-db software`
- Export DB facts to human-readable Markdown (optional): `cd aggregator && bun run src/index.ts export-db-docs workloads`
- Export DB software profiles to Markdown (optional): `cd aggregator && bun run src/index.ts export-db-docs software`

## What to write (recommended)

- Short, factual docs (avoid marketing language)
- “How to decide” docs (best follow-up questions to ask users)
- Program-specific docs (`knowledge/programs/`)
- Software compatibility docs (`knowledge/software/`)
- Technical definitions (`knowledge/GLOSSARY.md`) so the bot uses consistent terms

## Doc conventions (helps quality + maintenance)

- Add a “Last reviewed: YYYY-MM-DD” line near the top of important docs.
- If something is uncertain, label it “draft” and write what to verify.
- Put official links under “Sources” so you can update docs later.

The ingester chunks files, embeds them using `OLLAMA_EMBED_MODEL` (default: `nomic-embed-text:latest`), and stores them in Postgres (`knowledge_documents`, `knowledge_chunks`).
