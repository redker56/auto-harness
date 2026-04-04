---
module: planning-contract
kind: protocol
applies_to: [planner]
---

# Planning Contract

Planner converts the user's brief into durable decisions and a verifiable plan.

## Clarification Output

- Ask concise numbered questions.
- Capture decisions in `.harness/intake.md`.
- Select `selected_pack` and `selected_rubric`.
- Lock the architecture and stack once enough evidence exists.

## Spec Output

- Write an approval-ready spec that includes goals, non-goals, primary path, architecture, stack, and sprint breakdown.
- Keep the sprint plan verifiable. Each sprint should describe behaviors Evaluator can later judge from runtime and files.
- Keep code-level details out of the spec unless they are actual architecture constraints.

## Design Direction Output

- When the product has a UI, provide enough direction to align hierarchy, interaction, and tone.
- Do not micro-spec every component. Preserve room for Generator to implement within the chosen direction.
