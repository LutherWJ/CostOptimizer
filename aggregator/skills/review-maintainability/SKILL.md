---
name: review-maintainability
description: Evaluates code for maintainability, readability, and modularity. Use when refactoring or reviewing PRs to identify code smells, duplication, large functions, and lack of documentation.
---
# Review Maintainability Skill

This skill assists in evaluating code for long-term maintainability, specifically targeting structural health, readability, and modularity.

## Core Responsibilities

1.  **Identify Code Smells**: Look for large functions, deep nesting (high cyclomatic complexity), and duplicated logic.
2.  **Evaluate Modularity**: Ensure classes and functions adhere to the Single Responsibility Principle (SRP) and Don't Repeat Yourself (DRY) principles.
3.  **Assess Readability**: Check for clear, self-documenting code and appropriate use of comments for complex logic.

## Workflows

When asked to review code for maintainability:

1.  **Analyze Complexity**: Review the file for functions that are doing too much. Look for deep `if`/`else` or `for` loops.
2.  **Analyze DRY/SRP**: Check if logic could be abstracted into a helper function or if a class is taking on responsibilities outside its domain. Consult [references/clean-code.md](references/clean-code.md) for guidelines.
3.  **Report Findings**: Provide a prioritized list of maintainability issues. For complex functions, propose a refactored version that breaks the logic down into smaller, testable pieces.