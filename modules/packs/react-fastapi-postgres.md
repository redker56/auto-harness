---
module: react-fastapi-postgres-pack
kind: pack
applies_to: [planner, generator, evaluator]
exports:
  - react_fastapi_postgres_defaults
---

# React + FastAPI + Postgres Pack

Use this pack when the project should standardize on a separate SPA frontend and Python API backend.

Defaults:

- React frontend
- FastAPI backend
- Postgres for durable multi-user persistence
- clear UI, API, and persistence boundaries

Evaluator emphasis:

- check boundary discipline between frontend and backend
- verify API-backed user flows rather than file-only evidence
- fail hidden stack drift away from the locked React plus FastAPI plus Postgres choice
