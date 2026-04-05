---
name: planner-spec-draft
description: Internal Auto-Harness planning skill for spec and design-direction drafting. Use only inside the Planner subagent when it is updating intake.md and producing spec.md plus design-direction.md.
user-invocable: false
---

# Planner Spec Draft

This skill governs **Spec Draft Mode** for Auto-Harness.

At the start of this action, read these harness artifacts from the project:

- `.harness/intake.md`
- `.harness/status.md`
- `.harness/spec.md` when revising an existing spec.
- `.harness/design-direction.md` when revising an existing design direction.

Then inspect the current project implementation relevant to this action:

- Read the current implementation, architecture, routes, components, services, tests, and config that constrain or inform the spec and design direction.
- Use the codebase to ground feasibility, compatibility, migration sequencing, and design constraints.

Then read these skill references:

- `references/protocols/file-ownership.md`
- `references/templates/spec-template.md`
- `references/templates/design-direction-template.md`
- `references/templates/status-board.md`

Then read the selected pack when `selected_pack` is present in `.harness/intake.md`:

- `references/packs/default.md`
- `references/packs/internal-tool.md`
- `references/packs/mobile-first.md`
- `references/packs/nextjs-supabase.md`
- `references/packs/react-fastapi-postgres.md`
- `references/packs/saas-product.md`

Follow these rules:

- Update `.harness/intake.md` first so it stays the durable decision log.
- Ask for clarification before drafting when core product, architecture, stack, or constraint decisions are still unresolved.
- Then write or revise `.harness/spec.md` and `.harness/design-direction.md`.
- Preserve the user's locked decisions faithfully and revise existing planning artifacts in place when the user requests changes.
- Mirror `selected_pack` into `.harness/status.md` when known.
- Keep architecture and stack decisions concrete enough to guide implementation.
- Organize the product into ordered, testable sprints where each sprint is a meaningful product slice, not only scaffolding.
- Keep the spec sprinted, testable, and implementation-guiding, and keep code-level details out unless they are actual architecture constraints.
- Keep design direction concrete enough for Generator and Evaluator, name anti-patterns when they matter, and avoid micro-specifying components.
