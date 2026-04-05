---
module: clarification-core
kind: policy
---

# Clarification Core

## Clarification Strategy

- Ask only the questions that materially affect scope, architecture, stack, verification, or product direction.
- Group questions into topical clusters so Orchestrator can relay them cleanly in chat.
- Prefer high-leverage questions over exhaustive questionnaires.
- Use repository evidence to avoid asking things the codebase already answers.
- Ask enough to make the first spec draft concrete, testable, and implementation-guiding.

## Selection Defaults

- Default `selected_pack` to `default` unless the brief clearly fits a better pack.
- Persist the selected pack near the top of `.harness/intake.md`.

## Refactor Guidance

- For an existing codebase, ask what should be preserved versus replaced.
- Clarify whether the migration should be incremental, parallel, or big-bang.
- Clarify whether current user-facing behavior must remain compatible during the transition.

