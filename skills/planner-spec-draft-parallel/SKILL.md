---
name: planner-spec-draft-parallel
description: Internal Auto-Harness planning skill for parallel spec and design-direction drafting. Use only inside the Planner subagent when it is updating intake.md and producing spec.md plus design-direction.md under .harness-parallel.
user-invocable: false
---

# Planner Spec Draft Parallel

This skill governs **Spec Draft Mode** for the parallel Auto-Harness workflow.

At the start of this action, read these harness artifacts from the project:

- `.harness-parallel/intake.md`
- `.harness-parallel/status.md`
- `.harness-parallel/spec.md` when revising an existing spec.
- `.harness-parallel/design-direction.md` when revising an existing design direction.

Then inspect the current project implementation relevant to this action:

- Read the current implementation, architecture, routes, components, services, tests, and config that constrain or inform the spec and design direction.
- Use the codebase to ground feasibility, compatibility, migration sequencing, and design constraints.

Then read the same reference files used by `skills/planner-spec-draft/`, including its file-ownership protocol, spec template, design-direction template, and status-board template. Apply those rules to `.harness-parallel/` paths.

Follow these rules:

- Update `.harness-parallel/intake.md` first so it stays the durable decision log.
- Ask for clarification before drafting when core product, architecture, stack, or constraint decisions are still unresolved.
- Then write or revise `.harness-parallel/spec.md` and `.harness-parallel/design-direction.md`.
- Keep `workflow_mode=parallel` in `.harness-parallel/status.md`.
- Use `pending_action=spec_approval_parallel` when the spec is ready for user approval.
- Do not read or write `.harness/`.
- Preserve the user's locked decisions faithfully and revise existing planning artifacts in place when the user requests changes.
- Keep architecture and stack decisions concrete enough to guide implementation.
- Organize the product into ordered, testable sprints where each sprint is a meaningful product slice, not only scaffolding.
- Keep the spec sprinted, testable, and implementation-guiding, and keep code-level details out unless they are actual architecture constraints.
- Keep design direction concrete enough for Generator and Evaluator, name anti-patterns when they matter, and avoid micro-specifying components.
