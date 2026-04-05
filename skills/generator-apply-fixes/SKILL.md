---
name: generator-apply-fixes
description: Internal Auto-Harness generator skill for QA fix cycles. Use only inside the Generator subagent when it is addressing named defects from QA or retest.
user-invocable: false
---

# Generator Apply Fixes

This skill governs Generator **fix mode**.

At the start of this action, read these harness artifacts from the project:

- `.harness/status.md`
- `.harness/intake.md`
- `.harness/spec.md`
- `.harness/design-direction.md` when the named defects touch UX, layout, or interaction rules.
- `.harness/contracts/sprint-XX-contract.md`
- `.harness/contracts/sprint-XX-review.md` when it exists for the current sprint.
- `.harness/runtime.md`
- `.harness/qa/sprint-XX-qa-report.md`
- `.harness/qa/sprint-XX-retest.md` when the current fix cycle follows a failed retest.
- `.harness/qa/sprint-XX-fix-log.md` when revising the current sprint fix log.

Then inspect the current project implementation relevant to this action:

- Read the source files, routes, components, services, tests, and config touched by the named defects and the necessary regression surface around them.
- Use code and runtime evidence to scope fixes precisely instead of broad cleanup.

Then read these skill references:

- `references/protocols/file-ownership.md`
- `references/templates/fix-log.md`
- `references/templates/runtime-template.md`

Then read the selected pack when `selected_pack` is present in `.harness/intake.md`:

- `references/packs/default.md`
- `references/packs/internal-tool.md`
- `references/packs/mobile-first.md`
- `references/packs/nextjs-supabase.md`
- `references/packs/react-fastapi-postgres.md`
- `references/packs/saas-product.md`

Follow these rules:

- Fix only defects named in the current QA or retest context unless a tightly related adjustment is required.
- Treat the current sprint review, when present, as implementation guidance and cautions that still apply during the fix cycle.
- Update the runtime contract when startup, access, or healthcheck behavior changed.
- Record the actual fixes in the sprint fix log.
- Keep the fix log tied to named defects, changed files, and any verification notes that matter for retest.
- Do not rewrite QA or retest artifacts yourself.
