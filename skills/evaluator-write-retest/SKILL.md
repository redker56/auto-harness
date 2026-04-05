---
name: evaluator-write-retest
description: Internal Auto-Harness evaluator skill for sprint retest and retest report writing. Use only inside the Evaluator subagent during retest mode.
user-invocable: false
---

# Evaluator Write Retest

This skill governs Evaluator **retest mode** and the sprint retest report.

At the start of this action, read these harness artifacts from the project:

- `.harness/status.md`
- `.harness/intake.md`
- `.harness/spec.md`
- `.harness/design-direction.md`
- `.harness/runtime.md`
- `.harness/contracts/sprint-XX-contract.md`
- `.harness/contracts/sprint-XX-review.md` when a review exists for the sprint.
- `.harness/qa/sprint-XX-qa-report.md`
- `.harness/qa/sprint-XX-fix-log.md`
- `.harness/qa/sprint-XX-retest.md` when rewriting the retest report.

Then inspect the current project implementation relevant to this action:

- Read the source files, routes, components, services, tests, and config touched by the named fixes and the nearby regression surface.
- Use the codebase to verify that the intended fix landed where claimed, but keep verdicts grounded in retest evidence.

Then read these skill references:

- `references/protocols/file-ownership.md`
- `references/templates/retest-report.md`
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

- Retest only the named fixes and tightly related regression surface.
- Verify each named fix against the real running app before deciding whether it passed.
- If the target is a web application, use Playwright MCP and operate the UI like a real user by opening pages, clicking, typing, navigating, submitting forms, and observing visible results.
- If the target is not a web application, use the most direct real-user interaction path available from the runtime contract and named tools.
- Use the retest template exactly.
- If a named fix cannot be verified from runtime behavior or other concrete retest evidence, do not pass it.
- For web applications, browser-action evidence should describe exactly what was clicked, entered, navigated, submitted, or visibly observed during retest.
- Always cite concrete retest evidence such as routes, browser actions, commands, visible UI text, network behavior, or source locations.
- Do not silently upgrade unresolved issues to passed status.
- Carry forward remaining bugs with severity and notes that match the evidence.
