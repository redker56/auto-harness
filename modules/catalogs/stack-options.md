---
module: stack-options
kind: catalog
applies_to: [planner]
exports:
  - stack_families
  - default_stack_guidance
---

# Stack Options

Use this catalog to narrow the stack only after product and architecture needs are clear.

## Common Stack Families

- React or Vite frontend with FastAPI backend and SQLite or Postgres
- Next.js with Supabase for auth and hosted data
- browser-only app with localStorage or IndexedDB
- Node CLI or TUI with filesystem-based persistence
- Python or Node service with separate SPA frontend

## Default Guidance

- Prefer browser-only for small single-user tools that do not need cross-device sync.
- Prefer a simple API plus database for multi-user or cross-device products.
- For existing repos, preserve the current stack unless migration is part of the brief.
