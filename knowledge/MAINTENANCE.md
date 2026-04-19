# Maintaining the Knowledge Base (Quick Guide)

## Goal
Keep the support bot grounded in *your* information (school/program requirements + your database), and make updates fast.

## What to update most often

1) Program requirements
- Add/update files like `knowledge/programs/nursing.md`
- Put the school’s official links under “Sources”

2) Software compatibility
- If the school names specific tools (Examplify/Respondus/etc.), create/update:
  - `knowledge/software/<tool>.md` (if it’s not already in the DB-backed profiles)

3) Definitions
- Keep `knowledge/GLOSSARY.md` short and current (so answers stay consistent and non-academic)

## Workflow

1) Edit Markdown under `knowledge/`
2) Ingest docs:
- `cd aggregator`
- `bun run src/index.ts ingest-knowledge`

Optional (recommended): ingest DB facts too
- `bun run src/index.ts ingest-db workloads`
- `bun run src/index.ts ingest-db software`

## Quality checklist (fast)

- Is there a “Last reviewed” date?
- Does the doc say Windows-only vs macOS explicitly?
- Does it mention whether VMs/remote desktop are allowed (if relevant)?
- Are the sources linked for future verification?
