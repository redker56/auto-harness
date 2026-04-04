---
module: sprint-contract-template
kind: template
applies_to: [generator]
exports:
  - sprint_contract_template
---

# Sprint Contract Template

```md
# Sprint XX Contract

## Summary
- ...

## In Scope
- ...

## Out Of Scope
- ...

## Locked Assumptions
- ...

## Files Expected To Change
- ...

## Testable Behaviors
| # | Behavior | Verification |
| --- | --- | --- |

## Runtime Assumptions
- ...

## Risks Or Notes
- ...
```

Guidance:

- Keep behavior statements concrete enough for Evaluator to test.
- Name out-of-scope items so contract review can distinguish omission from intentional deferral.
