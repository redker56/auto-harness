---
module: architecture-options
kind: catalog
applies_to: [planner]
exports:
  - deployment_modes
  - module_decomposition
  - service_organization
---

# Architecture Options

Use this as a planning catalog, not as a mandate.

## Deployment Modes

- browser-only app with local persistence
- single web service with server-rendered or SPA frontend
- frontend plus backend API
- multi-service system with background workers
- terminal or desktop runtime

## Module Decomposition Patterns

- feature-first slices
- layered frontend or backend structure
- shared service layer plus thin UI layer
- domain services plus adapters

## Service Organization

- direct CRUD flows
- command and query separation
- event-driven or job-based processing
- long-running background tasks
