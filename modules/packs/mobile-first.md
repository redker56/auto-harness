---
module: mobile-first-pack
kind: pack
applies_to: [planner, generator, evaluator]
exports:
  - mobile_first_defaults
---

# Mobile-First Pack

Use this pack when the primary path must work well on narrow screens.

Priorities:

- single-column friendly information hierarchy
- touch-sized controls
- low-friction primary actions
- responsive layouts before desktop enhancement

Evaluator emphasis:

- check the primary path on constrained layouts
- fail if the main action flow becomes awkward or hidden on mobile widths
