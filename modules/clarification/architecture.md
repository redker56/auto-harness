---
module: clarification-architecture
kind: policy
applies_to: [planner]
---

# Architecture Clarification

Ask architecture questions when they materially affect implementation shape, runtime setup, or QA expectations.

Typical question families:

- deployment shape: local-only, client-only, client-server, multi-service
- persistence: local state, file-based, SQLite, Postgres, hosted database
- service decomposition: monolith, layered services, workers, background jobs
- execution model: synchronous flows, queues, polling, websockets
- boundaries: UI, app logic, shared API layer, infra layer
- auth and isolation: single-user, multi-user, tenant separation, roles
- integrations: third-party APIs, OAuth, webhooks, import or export surfaces

For refactors, also clarify:

- whether current service boundaries should remain
- whether old code paths must coexist during migration
- whether data formats or external CLI/API surfaces must remain stable
