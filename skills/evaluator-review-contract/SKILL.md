---
name: evaluator-review-contract
description: Internal Auto-Harness evaluator skill for sprint contract review before implementation. Use only inside the Evaluator subagent during review mode.
user-invocable: false
---

# Evaluator Review Contract

This skill governs Evaluator **review mode**.

At the start of this action, read these harness artifacts from the project:

- `.harness/status.md`
- `.harness/intake.md`
- `.harness/spec.md`
- `.harness/design-direction.md`
- `.harness/contracts/sprint-XX-contract.md`
- `.harness/contracts/sprint-XX-review.md` when revising an existing review.

Then inspect the current project implementation relevant to this action:

- Read the current source files, routes, components, services, tests, and config that determine whether the proposed sprint contract is feasible and respects locked decisions.
- Use the codebase to judge feasibility, integration points, and constraint compliance before implementation begins.

Then read these skill references:

- `references/templates/sprint-contract.md`
- `references/protocols/file-ownership.md`

Follow these rules:

- Review the sprint contract before implementation begins.
- Fail the review when scope, testability, verification readiness, or locked decisions are violated.
- Judge the contract against the written artifacts and the current implementation, not Generator intent.
- If feasibility or verification cannot be established from the current contract plus the existing codebase, fail conservatively and say why.
- Cite exact files, boundaries, runtime assumptions, or locked decisions when a hard blocker or revision request is raised.
- Write only the sprint review artifact.
- Do not modify application source code or generator-owned artifacts.
