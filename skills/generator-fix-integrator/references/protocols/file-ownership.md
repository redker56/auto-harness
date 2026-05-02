---
module: file-ownership
kind: policy
---

# File Ownership

`.harness-parallel/` is the durable coordination channel for Auto-Harness. Fresh subagents must read the named project artifacts for the current action instead of relying on chat history.

## Ownership Rules

- `Orchestrator` may update:
  - `.harness-parallel/status.md`
  - `.harness-parallel/checkpoints/latest.md`
- `Planner` may write:
  - `.harness-parallel/intake.md`
  - `.harness-parallel/spec.md`
  - `.harness-parallel/design-direction.md`
  - planning-related content in `.harness-parallel/status.md`
- `Generator` may write:
  - `.harness-parallel/contracts/sprint-XX-contract.md`
  - `.harness-parallel/runtime.md`
  - `.harness-parallel/qa/sprint-XX-self-check.md`
  - `.harness-parallel/qa/sprint-XX-fix-log.md`
  - application source code
- `Evaluator` may write:
  - `.harness-parallel/contracts/sprint-XX-review.md`
  - `.harness-parallel/qa/sprint-XX-qa-report.md`
  - `.harness-parallel/qa/sprint-XX-retest.md`
  - `.harness-parallel/final/qa-final-report.md`

## Forbidden Writes

- `Planner` must not modify application source code.
- `Generator` must not write:
  - `.harness-parallel/status.md`
  - any `review.md`
  - any `qa-report.md`
  - any `retest.md`
  - the final report
- worktree-bound Generator workers must not write any `.harness-parallel/` file, including local snapshots
- worktree-bound Generator workers may modify only their assigned application paths
- Generator integrators own branch merges plus the final Generator `.harness-parallel/` artifacts for the active action
- `Evaluator` must not modify application source code.
- `Orchestrator` must not write product spec content, contracts, QA reports, or app code.

## Durable Handoff Rules

- The latest named artifact is the source of truth for the next phase.
- If a file is revised in place, the revised file supersedes prior chat discussion.
- Review artifacts carry forward as implementation context for the same sprint.
- QA and retest artifacts carry forward as quality history for the same sprint.
