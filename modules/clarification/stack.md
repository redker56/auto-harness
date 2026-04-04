---
module: clarification-stack
kind: policy
applies_to: [planner]
exports:
  - stack_question_families
---

# Stack Clarification

Ask stack questions when they materially affect implementation scope, runtime setup, or hosting.

Typical question families:

- frontend framework and rendering model
- backend framework or whether no backend is needed
- database choice and hosting expectations
- runtime environment: Node, Python, browser-only, desktop, terminal
- deployment target: local machine, Vercel, Fly, Docker, internal server

Default behavior:

- If the user has no preference, propose the smallest reasonable stack for the problem.
- If the repo already has an established stack, prefer preserving it unless the user wants a deeper migration.
