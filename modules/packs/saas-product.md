---
module: saas-product-pack
kind: pack
applies_to: [planner, generator, evaluator]
exports:
  - saas_defaults
---

# SaaS Product Pack

Use this pack for customer-facing multi-user software products.

Priorities:

- onboarding and first-run clarity
- auth and account boundaries
- subscription or plan assumptions when relevant
- clear product loops, not just CRUD surfaces

Evaluator emphasis:

- check that the shipped sprint deepens the real product loop
- fail thin scaffolding masquerading as SaaS depth
