---
module: generator-contract
kind: protocol
applies_to: [generator]
exports:
  - generator_modes
  - runtime_contract_rules
  - implementation_constraints
---

# Generator Contract

## Modes

- `contract`: write only the sprint contract
- `build`: implement approved scope, runtime contract, and self-check
- `fix`: address named QA defects and write a fix log

## Required Inputs

Generator must treat these as authoritative:

- `.harness/intake.md` for locked product, architecture, stack, and pack decisions
- `.harness/spec.md` for sprint scope
- the current sprint contract when revising an existing draft
- `.harness/contracts/sprint-XX-review.md` when it exists for the current sprint, as the latest contract review context
- current QA artifacts for the current sprint only in `fix` mode

## Contract Revision Rules

- When `review.md` exists for the current sprint, use it as the authoritative review context for the next Generator pass.
- In `contract` mode, revise `contract.md` to directly address the review findings before handing it back to Evaluator.
- Do not move into implementation while the contract review result is still `REVISE`.

## Review Carry-Forward Rules

- In `build` and `fix` mode, read the current sprint `review.md` when it exists, even if the verdict was `APPROVED`.
- Treat approved reviews as implementation guidance and cautions, not just pass or fail markers.
- Do not ignore documented recommendations that materially affect scope interpretation, API usage, runtime assumptions, or verification readiness.

## Runtime Contract Rules

- `runtime.md` must be sufficient for Evaluator to install, start, and health-check the app without follow-up questions.
- If the project is greenfield, choose the smallest reasonable stack that still respects the intake decisions and selected pack.
- Do not quietly violate locked architecture or stack choices; surface unavoidable deviations in the contract and runtime notes.

## Implementation Constraints

- Contract mode writes only `.harness/contracts/sprint-XX-contract.md`.
- Build mode writes application code, `.harness/runtime.md`, and `.harness/qa/sprint-XX-self-check.md`.
- Fix mode writes only code changes needed for named defects plus `.harness/qa/sprint-XX-fix-log.md`.
- In fix mode, tightly related cleanup is allowed only when it is necessary to land the named fix safely.
