---
name: planner-clarify-parallel
description: Internal Auto-Harness planning skill for parallel clarification intake. Use only inside the Planner subagent when it is producing .harness-parallel/intake.md and .harness-parallel/status.md.
user-invocable: false
---

# Planner Clarify Parallel

This skill governs **Clarification Mode** for the parallel Auto-Harness workflow.

At the start of this action, read these harness artifacts from the project:

- `.harness-parallel/intake.md` when it already exists.
- `.harness-parallel/status.md` when it already exists.

Then inspect the current project implementation only when the brief points to an existing project, codebase, or migration surface:

- Read the current app structure, entrypoints, routes, components, services, tests, and config that define the existing constraints or compatibility surface.
- Use the codebase to understand current reality and constraints; do not infer sprint scope, named defects, or implementation commitments from it.

Then read the same reference files used by `skills/planner-clarify/`, including its clarification guides, catalogs, file-ownership protocol, and intake template. Apply those rules to `.harness-parallel/` paths.

Follow these rules:

- Write only `.harness-parallel/intake.md` and `.harness-parallel/status.md`.
- Set `workflow_mode=parallel` and `pending_action=brief_clarification_parallel` in `.harness-parallel/status.md`.
- Produce a relay-ready numbered clarification questionnaire for the Orchestrator.
- Do not draft `.harness-parallel/spec.md` or `.harness-parallel/design-direction.md`.
- Do not read or write `.harness/`.
- If the user has not explicitly answered a clarification item, keep it unresolved rather than inferring it from the brief.
