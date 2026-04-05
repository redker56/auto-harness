---
module: clarification-constraints
kind: policy
---

# Constraints Clarification

Ask for constraints that could invalidate an otherwise good design:

- delivery deadline or sprint-sizing constraints
- hosting or environment limits
- offline, local-only, or air-gapped operation
- accessibility requirements
- language, locale, or theming requirements
- dependency budget or framework restrictions
- compliance, privacy, or security rules
- explicit non-goals

Persist hard constraints in `.harness/intake.md` so Generator and Evaluator can treat them as locked decisions.

