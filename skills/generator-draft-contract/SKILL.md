---
name: generator-draft-contract
description: Internal Auto-Harness generator skill for sprint contract drafting. Use only inside the Generator subagent when it is producing or revising the current sprint contract.
user-invocable: false
---

# Generator Draft Contract

This skill governs Generator **contract mode**.

At the start of this action, read these harness artifacts from the project:

- `.harness/status.md`
- `.harness/intake.md`
- `.harness/spec.md`
- `.harness/design-direction.md`
- `.harness/contracts/sprint-XX-contract.md` when revising the current sprint contract.
- `.harness/contracts/sprint-XX-review.md` when a prior review exists for the current sprint.

Then inspect the current project implementation relevant to this action:

- Read the current implementation, architecture, routes, components, services, tests, and config that define the current sprint boundary and feasibility.
- Use the codebase plus the harness artifacts to draft an implementation-ready contract.

Then read these skill references:

- `references/protocols/file-ownership.md`
- `references/templates/sprint-contract.md`

Then read the selected pack when `selected_pack` is present in `.harness/intake.md`:

- `references/packs/default.md`
- `references/packs/internal-tool.md`
- `references/packs/mobile-first.md`
- `references/packs/nextjs-supabase.md`
- `references/packs/react-fastapi-postgres.md`
- `references/packs/saas-product.md`

Follow these rules:

- Treat `.harness/intake.md`, `.harness/spec.md`, the current sprint contract, and any current-sprint review artifact as authoritative inputs.
- Write only the current sprint contract artifact.
- If a review file already exists for the sprint, revise the contract directly against it.
- Do not move the sprint toward implementation while the current sprint review result remains `REVISE`.
- Treat an approved review as implementation guidance and cautions, not just a pass/fail stamp.
- Keep the contract implementation-ready and evaluable from runtime plus named files.
- Do not quietly violate locked architecture or stack choices; surface unavoidable deviations explicitly in the contract.
- Do not modify status, review, QA, retest, or final artifacts.
