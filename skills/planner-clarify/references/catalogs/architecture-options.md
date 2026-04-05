---
module: architecture-options
kind: catalog
---

# Architecture Options

Use this catalog to help narrow architecture decisions after product scope is clearer.

## Deployment Modes

- browser-only app with local persistence
- single web service with one deployable app
- frontend plus backend API
- multi-service system with workers or background jobs
- terminal or desktop runtime

## Module Decomposition

- feature-first slices
- layered structure by concern
- shared service layer plus thin UI layer
- domain services plus adapters
- app shell with plugin-style extensions

## Service Organization

- direct CRUD flows
- command and query separation
- event-driven or job-based processing
- long-running background tasks
- real-time websocket or subscription flows

## Decision Guidance

- Prefer the smallest architecture that satisfies the locked product and runtime needs.
- For refactors, preserve existing boundaries unless the brief explicitly calls for restructuring them.
- Lock only the boundaries that affect multiple sprints or QA expectations.

