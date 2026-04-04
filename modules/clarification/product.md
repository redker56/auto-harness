---
module: clarification-product
kind: policy
applies_to: [planner]
exports:
  - product_question_families
---

# Product Clarification

Ask product questions that define the actual shipped slice:

- Who is the primary user?
- What is the core user loop?
- What is in MVP versus deferred?
- What are explicit non-goals?
- What outputs or artifacts should the product create or manage?
- What success criteria would make the first release feel useful?

When the brief is a refactor:

- Ask what product behavior must remain unchanged.
- Ask what currently feels broken or awkward and should improve.
- Distinguish "new feature scope" from "replace the shell but preserve behavior."
