---
module: clarification-core
kind: policy
applies_to: [planner]
exports:
  - clarification_strategy
  - pack_selection_defaults
---

# Clarification Core

## Clarification Strategy

- Ask only the questions that materially affect scope, architecture, stack, verification, or product direction.
- Group questions into small topical clusters so Orchestrator can relay them cleanly in chat.
- Prefer high-leverage questions over exhaustive checklists.
- Use the existing codebase and project analysis to avoid asking things that are already obvious from the repository.
- If the brief is underspecified, ask enough to make the first spec draft concrete and testable.

## Selection Defaults

- Default `selected_pack` to `default` unless the user clearly implies a better-matching pack.
- Default `selected_rubric` to `default-grading` unless the project explicitly needs a different evaluation bar.
- Persist both defaults near the top of `.harness/intake.md`.

## Refactor Guidance

- For an existing codebase, ask what should be preserved versus replaced.
- Clarify whether the migration should be incremental, parallel, or big-bang.
- Clarify whether existing user-facing behavior must remain compatible during the transition.
