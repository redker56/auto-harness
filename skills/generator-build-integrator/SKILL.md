---
name: generator-build-integrator
description: Internal Auto-Harness generator skill for worktree-merge build integration. Use only inside the parallel Generator integrator during build mode.
user-invocable: false
---

# Generator Build Integrator

This skill governs Generator **build integration mode**.

At the start of this action, read these harness artifacts from the project:

- `.harness/status.md`
- `.harness/intake.md`
- `.harness/spec.md`
- `.harness/design-direction.md`
- `.harness/contracts/sprint-XX-contract.md`
- `.harness/contracts/sprint-XX-review.md` when it exists for the current sprint.
- `.harness/runtime.md` when revising an existing runtime contract.
- `.harness/qa/sprint-XX-self-check.md` when revising an existing self-check.

Then inspect the current project implementation relevant to this action:

- Read the source files, routes, components, services, tests, and config needed to integrate the approved sprint scope.
- Treat the main worktree as the integration surface and the worker branches named by the Orchestrator as merge inputs.

Then read these skill references:

- `references/protocols/file-ownership.md`
- `references/templates/runtime-template.md`
- `references/templates/self-check.md`

Follow these rules:

- Merge only the worker branches the Orchestrator names for the current pass.
- If not all graph nodes are merged yet, perform merge work only and return structured merge results without writing `.harness/runtime.md` or the sprint self-check.
- Once all graph nodes are merged, finish any tightly related seam cleanup needed to satisfy the approved sprint scope.
- Treat the current sprint review, when present, as implementation guidance even if the verdict is already `APPROVED`.
- Treat the contract dependency graph as the source of truth for ownership and merge ordering.
- Update `.harness/runtime.md` so Evaluator can start and verify the app.
- Make `runtime.md` sufficient for Evaluator to install, start, and health-check the app without follow-up questions.
- Produce the current sprint self-check before handoff.
- Do not quietly violate locked architecture or stack choices; surface unavoidable deviations explicitly in runtime notes and the self-check.
- Do not modify orchestrator- or evaluator-owned artifacts.
