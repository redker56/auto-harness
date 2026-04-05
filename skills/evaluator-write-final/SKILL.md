---
name: evaluator-write-final
description: Internal Auto-Harness evaluator skill for final QA report aggregation. Use only inside the Evaluator subagent during final mode.
user-invocable: false
hooks:
  PreToolUse:
    - matcher: "Write"
      hooks:
        - type: command
          if: "Write(*)"
          command: node "${CLAUDE_SKILL_DIR}/../_shared/skill-hook.mjs" pretool evaluator-write-final
    - matcher: "Edit"
      hooks:
        - type: command
          if: "Edit(*)"
          command: node "${CLAUDE_SKILL_DIR}/../_shared/skill-hook.mjs" pretool evaluator-write-final
    - matcher: "MultiEdit"
      hooks:
        - type: command
          if: "MultiEdit(*)"
          command: node "${CLAUDE_SKILL_DIR}/../_shared/skill-hook.mjs" pretool evaluator-write-final
  PostToolUse:
    - matcher: "Write"
      hooks:
        - type: command
          if: "Write(/.harness/final/qa-final-report.md)"
          command: node "${CLAUDE_SKILL_DIR}/../_shared/skill-hook.mjs" posttool evaluator-write-final
    - matcher: "Edit"
      hooks:
        - type: command
          if: "Edit(/.harness/final/qa-final-report.md)"
          command: node "${CLAUDE_SKILL_DIR}/../_shared/skill-hook.mjs" posttool evaluator-write-final
    - matcher: "MultiEdit"
      hooks:
        - type: command
          if: "MultiEdit(/.harness/final/qa-final-report.md)"
          command: node "${CLAUDE_SKILL_DIR}/../_shared/skill-hook.mjs" posttool evaluator-write-final
  Stop:
    - hooks:
        - type: command
          command: node "${CLAUDE_SKILL_DIR}/../_shared/skill-hook.mjs" stop evaluator-write-final
        - type: agent
          prompt: >-
            Audit the final QA report for rubric-writing compliance before allowing this
            skill to stop. Use the `evaluator-write-final` skill as the governing
            contract for this audit. Read the final report, read this skill, then read
            the rubric files and final report template/schema that this skill points to.
            Verify that the final recommendation, remaining-risk summary, severity
            vocabulary, and written conclusions follow the rubric files and the
            template/schema exactly. Do not do a fresh independent final judgment; only
            check whether the report was written according to the evaluator-write-final
            skill and the rubric/schema files it points to. If the report violates that
            contract, respond with {"ok": false, "reason": "short explanation naming the
            rubric or schema mismatch"}. Otherwise respond with {"ok": true}.
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

Then read the selected pack when `selected_pack` is present in `.harness/intake.md`:

- `references/packs/default.md`
- `references/packs/internal-tool.md`
- `references/packs/mobile-first.md`
- `references/packs/nextjs-supabase.md`
- `references/packs/react-fastapi-postgres.md`
- `references/packs/saas-product.md`

Follow these rules:

- Summarize the actual build and actual sprint outcomes that exist on disk.
- Use the final report template exactly.
- Aggregate from real review, QA, retest, self-check, and fix-log history instead of smoothing away failed or partial outcomes.
- Carry forward release blockers, hard-fail conditions, and unresolved risks with exact artifact references.
- Carry forward remaining risks honestly instead of smoothing them away.
- Base the release recommendation on the real QA history, not the intended roadmap.
