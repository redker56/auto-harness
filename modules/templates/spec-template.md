---
module: spec-template
kind: template
applies_to: [planner]
---

# Spec Template

```md
# Product Spec

## Approval Snapshot
- product: ...
- selected_pack: default
- selected_rubric: default-grading
- locked architecture: ...
- locked stack: ...
- total_sprints: ...

## Overview
- ...

## Goals
- ...

## Non-Goals
- ...

## Locked Decisions
- ...

## Sprint Plan
### Sprint 1
- theme: ...
- outcomes: ...

### Sprint 2
- theme: ...
- outcomes: ...

## Acceptance Notes
- ...
```

Guidance:

- Keep this implementation-guiding, not code-level.
- Sprint slices should be ordered, testable, and large enough to form meaningful product progress.
