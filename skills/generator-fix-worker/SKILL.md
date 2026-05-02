---
name: generator-fix-worker
description: Internal Auto-Harness generator skill for one temporary fix bug batch in a dedicated worktree.
user-invocable: false
---

# Generator Fix Worker

This skill governs a worktree-bound Generator **fix worker**.

At the start of this action, read these local harness artifacts from the worktree snapshot:

- `.harness-parallel/status.md`
- `.harness-parallel/intake.md`
- `.harness-parallel/spec.md`
- `.harness-parallel/design-direction.md` when the assigned bugs touch UX, layout, or interaction
- `.harness-parallel/contracts/sprint-XX-contract.md`
- `.harness-parallel/contracts/sprint-XX-review.md` when it exists for the current sprint
- `.harness-parallel/runtime.md`
- `.harness-parallel/qa/sprint-XX-qa-report.md`
- `.harness-parallel/qa/sprint-XX-retest.md` when this cycle follows a failed retest

Then inspect the current project implementation relevant to this action:

- Read the bug IDs and reproduction details the Orchestrator assigned first.
- Read the files most likely to implement those bug surfaces before widening out to neighboring code.
- Treat this worktree as isolated. Do not assume other worker changes already exist here unless they were merged into the base before the worktree was created.

Follow these rules:

- Fix only the assigned bug cluster.
- Keep edits tightly scoped to the files needed for the assigned bug IDs.
- Do not modify `.harness-parallel/` files.
- Run targeted verification for your assigned bug IDs before finishing.
- Make a local git commit in this worktree.
- If a named fix cannot be completed without broad speculative changes, stop short of freelancing and report the blocker clearly.
