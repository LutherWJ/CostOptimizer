---
name: review-conventions
description: Analyzes code against project-specific conventions. Use when reviewing code for correct naming conventions, architectural boundaries (e.g., Extractor -> Transformer -> Repository pattern), and TypeScript/Zod typing standards.
---
# Review Conventions Skill

This skill assists in reviewing TypeScript and Bun code within the CostOpt aggregator project to ensure it adheres to established conventions.

## Core Responsibilities

1.  **Enforce Architectural Boundaries**: Ensure code respects the ETL pipeline structure. Extractors should fetch data, Transformers should parse/validate it, and Repositories should store it.
2.  **Verify Naming Conventions**: Check that classes, methods, and variables follow consistent naming patterns (e.g., `*Service` for extractors, `*Transformer` for parsers, `*Repository` for DB access).
3.  **Validate Type Safety**: Ensure proper use of TypeScript types and Zod schemas, avoiding `any` or implicit typing where possible.

## Workflows

When asked to review code for conventions:

1.  **Analyze Architecture**: Read the codebase to understand where the file fits in the ETL pipeline. Consult [references/architecture.md](references/architecture.md) for detailed rules.
2.  **Analyze Style**: Review the file for naming and typing conventions. Consult [references/style-guide.md](references/style-guide.md) for specific TypeScript and Zod guidelines.
3.  **Report Findings**: Provide a clear, actionable list of convention violations, including specific line numbers and suggestions for how to align the code with project standards. Do not rewrite the entire file unless asked; focus on the violations.