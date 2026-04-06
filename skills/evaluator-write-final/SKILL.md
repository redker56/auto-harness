---
name: evaluator-write-final
description: Internal Auto-Harness evaluator skill for final QA report aggregation. Use only inside the Evaluator subagent during final mode.
user-invocable: false
---

# Evaluator Write Final

This skill governs Evaluator **final mode** and the final QA report.

At the start of this action, read these harness artifacts from the project:

- `.harness/status.md`
- `.harness/intake.md`
- `.harness/spec.md`
- `.harness/design-direction.md`
- `.harness/runtime.md`
- Every sprint review in `.harness/contracts/`.
- Every sprint QA report, retest report, self-check, and fix log in `.harness/qa/`.
- `.harness/final/qa-final-report.md` when revising an existing final report.

Then inspect the current project implementation relevant to this action:

- Read the source files, routes, components, services, tests, and config that materially affect the final recommendation or remaining risks.
- Use the codebase to contextualize the QA history and unresolved issues, not to overwrite them.

Then read these skill references:

- `references/protocols/file-ownership.md`
- `references/templates/final-report.md`
- `references/rubrics/default-grading.md`
- `references/rubrics/product-depth.md`
- `references/rubrics/bug-severity.md`
- `references/rubrics/visual-design.md`
- `references/rubrics/code-quality.md`

Follow these rules:

- Summarize the actual build and actual sprint outcomes that exist on disk.
- Use the final report template exactly.
- Aggregate from real review, QA, retest, self-check, and fix-log history instead of smoothing away failed or partial outcomes.
- Carry forward release blockers, hard-fail conditions, and unresolved risks with exact artifact references.
- Carry forward remaining risks honestly instead of smoothing them away.
- Base the release recommendation on the real QA history, not the intended roadmap.
