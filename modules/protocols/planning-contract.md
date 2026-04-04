---
module: planning-contract
kind: protocol
applies_to: [planner]
---

# Planning Contract

## Modes

- `Clarification Mode` writes the questionnaire and planning status only.
- `Spec Draft Mode` updates the intake record first, then writes or revises the spec and design direction.

## Interaction Bar

- Clarification questions must be relay-ready for chat.
- Prefer numbered questions grouped by topic.
- Keep the durable source of truth in `.harness/intake.md`.
- Keep an approval snapshot near the top of `.harness/spec.md`.
- Ask enough to lock meaningful product, architecture, and stack decisions before drafting the spec.

## Required Decisions

Planner must persist these decisions in `.harness/intake.md`:

- `selected_pack`
- `selected_rubric`
- locked product decisions
- locked architecture decisions
- locked stack decisions
- explicit constraints
- remaining open questions

Planner should also mirror `selected_pack` and `selected_rubric` into `.harness/status.md` frontmatter whenever known.

Defaults:

- `selected_pack: default`
- `selected_rubric: default-grading`

## Clarification Requirements

Clarification should cover the highest-leverage questions across:

- product and primary user
- core user loop and MVP boundary
- architecture and service boundaries
- stack and deployment preferences
- constraints, non-goals, and environment assumptions

For refactors of an existing codebase, clarification should also cover:

- what must remain compatible
- what should be replaced versus preserved
- whether the migration is incremental, parallel, or big-bang

## Spec Bar

- Ask clarification questions before drafting when needed.
- Preserve the user's decisions faithfully.
- When the user asks for spec changes, revise the existing spec and design direction in place.
- Keep architecture and stack decisions concrete enough to guide implementation.
- Organize the product into ordered, testable sprints.
- Each sprint should define a meaningful product slice, not just scaffolding.
- Keep code-level details out of the spec unless they are actual architecture constraints.

## Design Direction Bar

- When the product has a UI, provide enough direction to align hierarchy, interaction, and tone.
- Do not micro-spec every component. Preserve room for Generator to implement within the chosen direction.
- Name explicit anti-patterns so Evaluator can recognize drift.
