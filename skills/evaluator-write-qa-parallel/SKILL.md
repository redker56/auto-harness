---
name: evaluator-write-qa-parallel
description: Internal Auto-Harness evaluator skill for parallel sprint QA and QA report writing. Use only inside the Evaluator subagent during evaluator_qa_parallel.
user-invocable: false
---

# Evaluator Write QA Parallel

This skill governs Evaluator **qa mode** for the parallel Auto-Harness workflow.

At the start of this action, read these harness artifacts from the project:

- `.harness-parallel/status.md`
- `.harness-parallel/intake.md`
- `.harness-parallel/spec.md`
- `.harness-parallel/design-direction.md`
- `.harness-parallel/runtime.md`
- `.harness-parallel/contracts/sprint-XX-contract.md`
- `.harness-parallel/contracts/sprint-XX-review.md` when a review exists for the sprint.
- `.harness-parallel/qa/sprint-XX-self-check.md` when Generator produced a self-check.
- `.harness-parallel/qa/sprint-XX-qa-report.md` when rewriting the QA report.

Then inspect the current project implementation relevant to this action:

- Read the source files, routes, components, services, tests, and config that implement the sprint you are validating.
- Use running-app evidence first, and use the codebase to explain, verify, or localize what you observe.

Then read the same reference files used by `skills/evaluator-write-qa/`, including its file-ownership protocol, QA report template, and grading rubrics. Apply those rules to `.harness-parallel/` paths.

Follow these rules:

- Write only `.harness-parallel/qa/sprint-XX-qa-report.md`.
- Do not read or write `.harness/`.
- Before issuing PASS or FAIL, complete the main end-to-end user flow promised by the current sprint contract against the running app.
- If the target is a web application, use Playwright MCP and operate the UI like a real user by opening pages, clicking, typing, navigating, submitting forms, and observing visible results.
- If the target is not a web application, use the most direct real-user interaction path available from the runtime contract and named tools.
- If you cannot complete the main contracted user flow from the running app, do not pass on file inspection alone; record the verification gap and fail conservatively.
- Use the QA report template exactly.
- Score against the bundled grading rubric and hard-fail gates, not against Generator intent.
- Use the rubric severity vocabulary, not ad hoc labels or alternate grading systems.
- Include a `Deduction Ledger` that traces every actual deduction or hard-fail trigger used to derive the final scorecard.
- Make the `Scorecard` derivable from the rubric baselines and the rows in `Deduction Ledger`.
- Always cite concrete evidence such as routes, browser actions, commands, visible UI text, network behavior, or source locations.
- Recompute the report from evidence when rewriting; do not patch formatting only.
