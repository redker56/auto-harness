---
name: generator-fix-integrator
description: Internal Auto-Harness generator skill for worktree-merge fix integration. Use only inside the parallel Generator integrator when it is addressing named defects from QA or retest.
user-invocable: false
---

# Generator Fix Integrator

This skill governs Generator **fix integration mode**.

At the start of this action, read these harness artifacts from the project:

- `.harness-parallel/status.md`
- `.harness-parallel/intake.md`
- `.harness-parallel/spec.md`
- `.harness-parallel/design-direction.md` when the named defects touch UX, layout, or interaction rules.
- `.harness-parallel/contracts/sprint-XX-contract.md`
- `.harness-parallel/contracts/sprint-XX-review.md` when it exists for the current sprint.
- `.harness-parallel/runtime.md`
- `.harness-parallel/qa/sprint-XX-qa-report.md`
- `.harness-parallel/qa/sprint-XX-retest.md` when the current fix cycle follows a failed retest.
- `.harness-parallel/qa/sprint-XX-fix-log.md` when revising the current sprint fix log.

Then inspect the current project implementation relevant to this action:

- Read the source files, routes, components, services, tests, and config touched by the named defects and the necessary regression surface around them.
- Treat the main worktree as the integration surface and the worker branches named by the Orchestrator as merge inputs.

Then read these skill references:

- `references/protocols/file-ownership.md`
- `references/templates/fix-log.md`
- `references/templates/runtime-template.md`

Follow these rules:

- Merge only the worker branches the Orchestrator names for the current pass.
- If not all temporary fix nodes are merged yet, perform merge work only and return structured merge results without writing `.harness-parallel/qa/sprint-XX-fix-log.md` or updating runtime notes.
- Once all fix-workstream nodes are merged, finish any tightly related cleanup still required for the named defects.
- Fix only defects named in the current QA or retest context unless a tightly related adjustment is required.
- Treat the current sprint review, when present, as implementation guidance and cautions that still apply during the fix cycle.
- Treat the Orchestrator's named bug batches plus `## Parallel Execution State` as the source of truth for merge ordering.
- Update the runtime contract when startup, access, or healthcheck behavior changed.
- Record the actual fixes in the sprint fix log.
- Keep the fix log tied to named defects, changed files, and any verification notes that matter for retest.
- Do not rewrite QA or retest artifacts yourself.
