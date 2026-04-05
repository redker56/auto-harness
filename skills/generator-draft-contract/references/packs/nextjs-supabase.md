---
module: nextjs-supabase-pack
kind: pack
---

# Next.js + Supabase Pack

Use this pack when the project should standardize on Next.js with Supabase-backed auth and data.

Defaults:

- Next.js for app shell and routing
- Supabase for auth, hosted database, and storage when needed
- shared typed API or query layer instead of scattered direct calls

Evaluator emphasis:

- check auth boundaries
- check data access consistency
- fail hidden stack drift away from the locked Next.js plus Supabase choice

