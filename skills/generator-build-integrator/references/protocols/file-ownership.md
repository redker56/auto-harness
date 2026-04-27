---
module: file-ownership
kind: policy
---

# File Ownership

`.harness/` is the durable coordination channel for Auto-Harness. Fresh subagents must read the named project artifacts for the current action instead of relying on chat history.

## Ownership Rules

- `Orchestrator` may update:
  - `.harness/status.md`
  - `.harness/checkpoints/latest.md`
- `Planner` may write:
  - `.harness/intake.md`
  - `.harness/spec.md`
  - `.harness/design-direction.md`
  - planning-related content in `.harness/status.md`
- `Generator` may write:
  - `.harness/contracts/sprint-XX-contract.md`
  - `.harness/runtime.md`
  - `.harness/qa/sprint-XX-self-check.md`
  - `.harness/qa/sprint-XX-fix-log.md`
  - application source code
- `Evaluator` may write:
  - `.harness/contracts/sprint-XX-review.md`
  - `.harness/qa/sprint-XX-qa-report.md`
  - `.harness/qa/sprint-XX-retest.md`
  - `.harness/final/qa-final-report.md`

## Forbidden Writes

- `Planner` must not modify application source code.
- `Generator` must not write:
  - `.harness/status.md`
  - any `review.md`
  - any `qa-report.md`
  - any `retest.md`
  - the final report
- worktree-bound Generator workers must not write any `.harness/` file, including local snapshots
- worktree-bound Generator workers may modify only their assigned application paths
- Generator integrators own branch merges plus the final Generator `.harness/` artifacts for the active action
- `Evaluator` must not modify application source code.
- `Orchestrator` must not write product spec content, contracts, QA reports, or app code.

## Durable Handoff Rules

- The latest named artifact is the source of truth for the next phase.
- If a file is revised in place, the revised file supersedes prior chat discussion.
- Review artifacts carry forward as implementation context for the same sprint.
- QA and retest artifacts carry forward as quality history for the same sprint.
