---
module: consistency-patterns
kind: catalog
---

# Consistency Patterns

Use this catalog to identify project-wide conventions worth locking early.

Typical patterns worth standardizing:

- loading, error, and empty-state shape
- naming conventions for ids, handlers, DTOs, and derived state
- mutation flow and optimistic update policy
- API response shape
- component state versus store state boundaries
- persistence access through shared services rather than direct UI imports

Avoid over-specifying patterns before they are needed; standardize only the ones that affect multiple files or sprints.

