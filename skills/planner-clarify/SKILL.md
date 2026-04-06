---
name: planner-clarify
description: Internal Auto-Harness planning skill for clarification intake. Use only inside the Planner subagent when it is producing .harness/intake.md and .harness/status.md.
user-invocable: false
---

# Planner Clarify

This skill governs **Clarification Mode** for Auto-Harness.

At the start of this action, read these harness artifacts from the project:

- `.harness/intake.md` when it already exists.
- `.harness/status.md` when it already exists.

Then inspect the current project implementation only when the brief points to an existing project, codebase, or migration surface:

- Read the current app structure, entrypoints, routes, components, services, tests, and config that define the existing constraints or compatibility surface.
- Use the codebase to understand current reality and constraints; do not infer sprint scope, named defects, or implementation commitments from it.

Then read these skill references:

- `references/protocols/file-ownership.md`
- `references/clarification/core.md`
- `references/clarification/product.md`
- `references/clarification/architecture.md`
- `references/clarification/stack.md`
- `references/clarification/constraints.md`
- `references/catalogs/architecture-options.md`
- `references/catalogs/consistency-patterns.md`
- `references/catalogs/frontend-patterns.md`
- `references/catalogs/stack-options.md`
- `references/templates/intake-template.md`

Follow these rules:

- Write only `.harness/intake.md` and `.harness/status.md`.
- Produce a relay-ready numbered clarification questionnaire for the Orchestrator.
- Do not draft `.harness/spec.md` or `.harness/design-direction.md`.
- If the user has not explicitly answered a clarification item, keep it unresolved rather than inferring it from the brief.
