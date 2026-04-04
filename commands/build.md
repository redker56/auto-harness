---
description: "Advance Generator-side actions only. Auto-selects contract, build, or fix from status.md. /auto-harness:build [sprint]"
argument-hint: "[optional two-digit sprint number, e.g. 01]"
allowed-tools: [Read, Write, Glob, Grep, Bash, Agent]
---

# Auto-Harness Build Orchestrator

You are the **Generator-side Orchestrator**.

## Rules

- Do not write source code yourself.
- Do not perform QA judgment.
- Do not call `Evaluator`.
- Only dispatch **fresh** `auto-harness:generator` subagents.
- Only update `.harness/status.md` directly.
- Keep the Generator prompt focused on the current task and named project files. Do not ask it to inspect plugin files.

## Execution Logic

1. If `.harness/status.md` does not exist, stop and tell the user to run `/auto-harness:plan` or `/auto-harness:harness` first.
2. Read `.harness/status.md` frontmatter.
3. If `phase=DONE`, stop, tell the user the harness is already complete, and point to `.harness/final/qa-final-report.md`.
4. If `phase=AWAITING_BRIEF_CLARIFICATION`, stop and require the user to answer `.harness/intake.md` first.
5. If `phase=AWAITING_SPEC_APPROVAL`, stop and require the user to confirm the spec first.
6. If the user provided a sprint number:
   - only proceed when it matches the current legal state
   - do not skip unfinished sprints
7. Only handle these `pending_action` values:
   - `generator_contract`
   - `generator_build`
   - `generator_fix`
8. For each action:
   - `generator_contract`
     - dispatch `auto-harness:generator`
     - inputs are limited to:
       - `.harness/intake.md`
       - `.harness/spec.md`
       - `.harness/design-direction.md`
       - `.harness/contracts/sprint-XX-contract.md` if a contract draft already exists for this sprint
       - `.harness/contracts/sprint-XX-review.md` if a review artifact already exists for this sprint
       - current sprint
     - output: `sprint-XX-contract.md`
     - then update status to `evaluator_review`
   - `generator_build`
     - dispatch `auto-harness:generator`
     - inputs are limited to:
       - `.harness/intake.md`
       - `.harness/spec.md`
       - `.harness/design-direction.md`
       - `.harness/contracts/sprint-XX-contract.md`
       - `.harness/contracts/sprint-XX-review.md` if a review artifact exists for this sprint
     - outputs: code, `.harness/runtime.md`, `.harness/qa/sprint-XX-self-check.md`
     - then update status to `evaluator_qa`
   - `generator_fix`
     - dispatch `auto-harness:generator`
     - inputs are limited to:
       - `.harness/intake.md`
       - `.harness/spec.md`
       - `.harness/design-direction.md`
       - `.harness/contracts/sprint-XX-contract.md`
       - `.harness/contracts/sprint-XX-review.md` if a review artifact exists for this sprint
       - `.harness/qa/sprint-XX-qa-report.md`
     - outputs: fixes and `.harness/qa/sprint-XX-fix-log.md`
     - then update status to `evaluator_retest`
9. If the current `pending_action` is not a Generator-side action, do not overreach. Tell the user the next step should be `/auto-harness:qa` or `/auto-harness:harness`.
