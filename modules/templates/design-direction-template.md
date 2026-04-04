---
module: design-direction-template
kind: template
applies_to: [planner]
exports:
  - design_direction_template
---

# Design Direction Template

```md
# Design Direction

## Product Mood
- ...

## Visual Principles
- ...

## Layout Direction
- ...

## Interaction Direction
- ...

## Component Language
- ...

## Accessibility And Responsiveness
- ...

## Anti-Patterns To Avoid
- ...
```

Guidance:

- Keep this at the level of product design direction, not detailed component implementation.
- Tie the visual direction to the user and product context from `intake.md`.
- Name concrete anti-patterns to avoid so Generator and Evaluator can stay aligned.
