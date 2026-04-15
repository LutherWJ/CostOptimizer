---
name: review-robustness
description: Scrutinizes code for potential failures, unhandled errors, and edge cases. Use to ensure the system is production-ready, focusing on fail-fast mechanisms, input validation, and API rate limit handling.
---
# Review Robustness Skill

This skill assists in ensuring the codebase is reliable, resilient, and fails safely under adverse conditions.

## Core Responsibilities

1.  **Fail-Fast Architecture**: Ensure that critical initialization errors (like missing environment variables or API keys) throw exceptions immediately, rather than silently degrading or returning empty data.
2.  **API Reliability**: Check that HTTP requests correctly handle non-200 responses (e.g., 401, 403, 429) and network timeouts.
3.  **Data Integrity**: Ensure that external data is validated before being processed and that database operations use transactions where appropriate to avoid partial states.
4.  **Error Logging**: Verify that errors are logged comprehensively using the centralized `logger.ts` utility.

## Workflows

When asked to review code for robustness:

1.  **Analyze Fail-Fast Behavior**: Check if the code silently catches errors when it shouldn't. Consult [references/error-handling.md](references/error-handling.md) for guidelines on when to throw versus log.
2.  **Analyze Resilience**: Review API interaction logic. Are timeouts handled? Are rate limits respected? Are promises properly awaited and caught?
3.  **Report Findings**: Provide a list of potential failure points and edge cases that the current implementation misses. Suggest concrete fixes to improve the resilience of the component.