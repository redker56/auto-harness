---
name: evaluator-write-final-parallel
description: Internal Auto-Harness evaluator skill for parallel final QA report aggregation. Use only inside the Evaluator subagent during evaluator_final_parallel.
user-invocable: false
---

# Evaluator Write Final Parallel

This skill governs Evaluator **final mode** for the parallel Auto-Harness workflow.

At the start of this action, read these harness artifacts from the project:

- `.harness-parallel/status.md`
- `.harness-parallel/intake.md`
- `.harness-parallel/spec.md`
- `.harness-parallel/design-direction.md`
- `.harness-parallel/runtime.md`
- Every sprint review in `.harness-parallel/contracts/`.
- Every sprint QA report, retest report, self-check, and fix log in `.harness-parallel/qa/`.
- `.harness-parallel/final/qa-final-report.md` when revising an existing final report.

Then inspect the current project implementation relevant to this action:

- Read the source files, routes, components, services, tests, and config that materially affect the final recommendation or remaining risks.
- Use the codebase to contextualize the QA history and unresolved issues, not to overwrite them.

Then read the same reference files used by `skills/evaluator-write-final/`, including its file-ownership protocol, final report template, and rubrics. Apply those rules to `.harness-parallel/` paths.

Follow these rules:

- Write only `.harness-parallel/final/qa-final-report.md`.
- Do not read or write `.harness/`.
- Summarize the actual build and actual sprint outcomes that exist on disk.
- Use the final report template exactly.
- Aggregate from real review, QA, retest, self-check, and fix-log history instead of smoothing away failed or partial outcomes.
- Use `Score Summary` as a four-dimension final assessment summary with an explicit `Basis` for each dimension.
- Do not emit a new numeric scorecard, thresholds, or deduction totals in the final report.
- Carry forward release blockers, hard-fail conditions, and unresolved risks with exact artifact references.
- Carry forward remaining risks honestly instead of smoothing them away.
- Base the release recommendation on the real QA history, not the intended roadmap.
