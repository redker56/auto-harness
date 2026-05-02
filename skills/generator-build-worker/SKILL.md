---
name: generator-build-worker
description: Internal Auto-Harness generator skill for one build dependency-graph node in a dedicated worktree.
user-invocable: false
---

# Generator Build Worker

This skill governs a worktree-bound Generator **build worker**.

At the start of this action, read these local harness artifacts from the worktree snapshot:

- `.harness-parallel/status.md`
- `.harness-parallel/intake.md`
- `.harness-parallel/spec.md`
- `.harness-parallel/design-direction.md`
- `.harness-parallel/contracts/sprint-XX-contract.md`
- `.harness-parallel/contracts/sprint-XX-review.md` when it exists for the current sprint

Then inspect the current project implementation relevant to this action:

- Read the assigned owned files or globs first.
- Read neighboring files only as dependency context unless the Orchestrator explicitly assigned them to you.
- Treat this worktree as isolated. Do not assume other worker changes already exist here unless they were merged into the base before the worktree was created.

Follow these rules:

- Implement only the assigned dependency-graph node.
- Modify only the owned files or globs named by the Orchestrator.
- Do not modify `.harness-parallel/` files.
- Run targeted verification for your node before finishing.
- Make a local git commit in this worktree.
- If your task cannot be completed without touching an unowned path, stop short of freelancing and report the blocker clearly.
