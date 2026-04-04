---
module: stack-options
kind: catalog
applies_to: [planner]
---

# Stack Options

Use this catalog to narrow the implementation stack only after the product and architecture shape are clear.

## Common Stack Families

- React or Vite frontend with FastAPI backend and SQLite or Postgres
- Next.js with Supabase for auth and hosted data
- browser-only app with localStorage or IndexedDB
- Node CLI or TUI with filesystem-based persistence
- Python or Node service with separate SPA frontend

## Selection Guidance

- Prefer browser-only for small single-user tools that do not need cross-device sync.
- Prefer a simple API plus database for multi-user or cross-device products.
- Prefer preserving the current repo stack when refactoring, unless the migration itself is part of the brief.
- Avoid introducing hosted dependencies unless they solve a real product or deployment constraint.
