---
module: sprint-contract-template
kind: template
---

# Sprint Contract Template

```md
# Sprint XX Contract

## Summary
- ...

## Primary Path
- ...

## In Scope
- ...

## Out Of Scope
- ...

## Locked Assumptions
- ...

## Files Expected To Change
- ...

## Parallel Workstreams
| Stream | Goal | Owned Files | Depends On | Ready At Start? | Notes |
| --- | --- | --- | --- | --- | --- |

## Dependency Graph JSON
```json
{
  "mode": "generator_build_parallel",
  "nodes": [
    {
      "id": "build-example-node",
      "title": "Example node",
      "goal": "Implement one coherent slice of the sprint",
      "owned_paths": ["src/example.ts"],
      "behavior_ids": ["1"],
      "depends_on": [],
      "notes": ""
    }
  ]
}
```

## Testable Behaviors
| # | Behavior | Verification |
| --- | --- | --- |

## Runtime Assumptions
- ...

## Risks Or Notes
- ...
```

Guidance:

- Name the sprint's primary end-to-end user path so Evaluator can exercise it consistently.
- Keep behavior statements concrete enough for Evaluator to test.
- Name out-of-scope items so contract review can distinguish omission from intentional deferral.
- Always include at least one workstream row and a valid `Dependency Graph JSON` block, even when the sprint is effectively serial.
- Keep `owned_paths` file- or module-disjoint across nodes.
- `behavior_ids` should reference rows from `## Testable Behaviors`.
