---
module: clarification-architecture
kind: policy
applies_to: [planner]
exports:
  - architecture_question_families
---

# Architecture Clarification

Ask architecture questions only when they change implementation shape or QA expectations.

Typical question families:

- deployment shape: local-only, client-only, client-server, multi-service
- persistence: local state, file-based, SQLite, Postgres, hosted database
- execution model: synchronous CRUD, background jobs, queues, polling, websockets
- boundaries: UI, app logic, shared API layer, infra layer
- auth and isolation: single-user, multi-user, tenant separation, roles
- integrations: third-party APIs, OAuth, webhooks, file import or export

For refactors, also clarify:

- whether the current service boundaries should remain
- whether old code paths must coexist during migration
- whether data formats or external CLI/API surfaces must remain stable
