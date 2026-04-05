---
name: generator-build-sprint
description: Internal Auto-Harness generator skill for approved sprint implementation. Use only inside the Generator subagent during build mode.
user-invocable: false
---

# Generator Build Sprint

This skill governs Generator **build mode**.

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

- Read the source files, routes, components, services, tests, and config needed to implement the approved sprint scope.
- Use the existing codebase as the implementation surface, not only the harness artifacts.

Then read these skill references:

- `references/protocols/file-ownership.md`
- `references/templates/runtime-template.md`
- `references/templates/self-check.md`

Then read the selected pack when `selected_pack` is present in `.harness/intake.md`:

- `references/packs/default.md`
- `references/packs/internal-tool.md`
- `references/packs/mobile-first.md`
- `references/packs/nextjs-supabase.md`
- `references/packs/react-fastapi-postgres.md`
- `references/packs/saas-product.md`

Follow these rules:

- Implement only the approved sprint scope.
- Treat the current sprint review, when present, as implementation guidance even if the verdict is already `APPROVED`.
- Update `.harness/runtime.md` so Evaluator can start and verify the app.
- Make `runtime.md` sufficient for Evaluator to install, start, and health-check the app without follow-up questions.
- Produce the current sprint self-check before handoff.
- Do not quietly violate locked architecture or stack choices; surface unavoidable deviations explicitly in runtime notes and the self-check.
- Do not modify orchestrator- or evaluator-owned artifacts.
