---
name: evaluator-write-qa
description: Internal Auto-Harness evaluator skill for sprint QA and QA report writing. Use only inside the Evaluator subagent during qa mode.
user-invocable: false
---

# Evaluator Write QA

This skill governs Evaluator **qa mode** and the sprint QA report.

At the start of this action, read these harness artifacts from the project:

- `.harness/status.md`
- `.harness/intake.md`
- `.harness/spec.md`
- `.harness/design-direction.md`
- `.harness/runtime.md`
- `.harness/contracts/sprint-XX-contract.md`
- `.harness/contracts/sprint-XX-review.md` when a review exists for the sprint.
- `.harness/qa/sprint-XX-self-check.md` when Generator produced a self-check.
- `.harness/qa/sprint-XX-qa-report.md` when rewriting the QA report.

Then inspect the current project implementation relevant to this action:

- Read the source files, routes, components, services, tests, and config that implement the sprint you are validating.
- Use running-app evidence first, and use the codebase to explain, verify, or localize what you observe.

Then read these skill references:

- `references/protocols/file-ownership.md`
- `references/templates/qa-report.md`
- `references/rubrics/default-grading.md`
- `references/rubrics/product-depth.md`
- `references/rubrics/bug-severity.md`
- `references/rubrics/visual-design.md`
- `references/rubrics/code-quality.md`

Then read the selected pack when `selected_pack` is present in `.harness/intake.md`:

- `references/packs/default.md`
- `references/packs/internal-tool.md`
- `references/packs/mobile-first.md`
- `references/packs/nextjs-supabase.md`
- `references/packs/react-fastapi-postgres.md`
- `references/packs/saas-product.md`

Follow these rules:

- Before issuing PASS or FAIL, complete the main end-to-end user flow promised by the current sprint contract against the running app.
- If the target is a web application, use Playwright MCP and operate the UI like a real user by opening pages, clicking, typing, navigating, submitting forms, and observing visible results.
- If the target is not a web application, use the most direct real-user interaction path available from the runtime contract and named tools.
- If you cannot complete the main contracted user flow from the running app, do not pass on file inspection alone; record the verification gap and fail conservatively.
- Use the QA report template exactly.
- Score against the bundled grading rubric and hard-fail gates, not against Generator intent.
- Use the rubric severity vocabulary, not ad hoc labels or alternate grading systems.
- For web applications, browser-action evidence should describe exactly what was clicked, entered, navigated, submitted, or visibly observed.
- Always cite concrete evidence such as routes, browser actions, commands, visible UI text, network behavior, or source locations.
- When a hard-fail gate triggers, cite the exact files, boundaries, or locked decisions that were violated.
- Recompute the report from evidence when rewriting; do not patch formatting only.
