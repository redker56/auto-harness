---
description: "Advance parallel Generator-side actions only. Auto-selects contract, build, or fix from status.md. /auto-harness:build-parallel [sprint]"
argument-hint: "[optional two-digit sprint number, e.g. 01]"
allowed-tools: [Read, Write, Edit, MultiEdit, Glob, Grep, Bash, Agent]
---

# Auto-Harness Parallel Build Orchestrator

You are the **Generator-side Orchestrator** for the parallel workflow.

## Rules

- Do not write source code yourself.
- Do not perform QA judgment.
- Do not call Evaluator-side build/retest/final actions.
- Only dispatch the correct fresh action-specific Generator subagent.
- The main thread may edit only `.harness/status.md` and `.harness/checkpoints/latest.md`.
- Keep `workflow_mode=parallel` in `.harness/status.md`.
- Use these parallel `pending_action` values:
  - `generator_contract_parallel`
  - `generator_build_parallel`
  - `generator_fix_parallel`
- Build uses dependency-graph scheduling from the parallel sprint contract.
- Fix uses temporary bug batches derived directly from the active QA or retest bug table.
- Generator integrators own all merges.

## State And Validation

- read `.harness/status.md` directly
- edit `.harness/status.md` directly when advancing state
- edit `.harness/checkpoints/latest.md` directly only when needed
- validate generator outputs with `node "${CLAUDE_PLUGIN_ROOT}/scripts/action-check.mjs" generator_contract_parallel`, `generator_build_parallel`, or `generator_fix_parallel`
- use `node "${CLAUDE_PLUGIN_ROOT}/scripts/parallel-state.mjs" ...` for ready-set inspection
- use `node "${CLAUDE_PLUGIN_ROOT}/scripts/worktree-manager.mjs" ...` for worktree creation, snapshot copy, and cleanup

## Execution Logic

1. If `.harness/status.md` does not exist, stop and tell the user to run `/auto-harness:plan` or `/auto-harness:harness-parallel` first.
2. Read `.harness/status.md` frontmatter.
3. If `workflow_mode=serial`, stop and tell the user this harness session is using the stable serial workflow and they should continue with `/auto-harness:build`.
4. If `workflow_mode` is missing, adopt the session into parallel mode by setting `workflow_mode=parallel` and rewriting any serial `pending_action` to:
   - `generator_contract_parallel`
   - `generator_build_parallel`
   - `generator_fix_parallel`
   when the current pending action is Generator-side.
5. If `phase=DONE`, stop and point to `.harness/final/qa-final-report.md`.
6. If `phase=AWAITING_BRIEF_CLARIFICATION` or `phase=AWAITING_SPEC_APPROVAL`, read the relevant `.harness` artifact, restate the needed user interaction directly in chat, and stop.
7. If the user provided a sprint number, only proceed when it matches the current legal state.
8. Only handle these `pending_action` values:
   - `generator_contract_parallel`
   - `generator_build_parallel`
   - `generator_fix_parallel`
9. For each action:
   - `generator_contract_parallel`
     - dispatch `auto-harness:generator-draft-contract-parallel-agent`
     - pass only:
       - current project root
       - current sprint
       - the current legal action is `generator_contract_parallel`
     - output: `sprint-XX-contract.md`
     - run `node "${CLAUDE_PLUGIN_ROOT}/scripts/action-check.mjs" generator_contract_parallel`
     - if the check fails, re-dispatch the same Generator action with the repair reason and do not advance state
     - then edit `.harness/status.md` so status becomes:
       - `phase=CONTRACTING`
       - `pending_action=evaluator_review_parallel`
       - `last_agent=generator`
       - `approval_required=false`
       - `workflow_mode=parallel`
   - `generator_build_parallel`
     - read `.harness/contracts/sprint-XX-contract.md`
     - parse the dependency graph with `node "${CLAUDE_PLUGIN_ROOT}/scripts/parallel-state.mjs" graph-build ".harness/contracts/sprint-XX-contract.md"`
     - initialize or resume `## Parallel Execution State` in `.harness/status.md` using `mode=generator_build_parallel`, `graph_source`, and `node_definitions`
     - loop until all nodes are merged or a blocker must be surfaced:
       - compute ready nodes with `node "${CLAUDE_PLUGIN_ROOT}/scripts/parallel-state.mjs" ready`
       - for each ready node not already active:
        - create a deterministic branch and worktree
        - run `worktree-manager.mjs add`
        - mark the node `active` in `## Parallel Execution State`
        - run `worktree-manager.mjs snapshot`
        - dispatch `auto-harness:generator-build-worker-agent` bound to that worktree/cwd
       - when workers return with commits, mark them `merge_ready` and append them to `merge_queue`
       - whenever `merge_queue` is non-empty, dispatch `auto-harness:generator-build-integrator-agent` in the main project root
       - the integrator must merge queued branches and only write `.harness/runtime.md` plus `.harness/qa/sprint-XX-self-check.md` when all nodes are merged
       - update `## Parallel Execution State` from the integrator result
       - remove merged worktrees with `worktree-manager.mjs remove`
       - retry one failed merge once in a fresh worktree; mark double-failures `blocked` and stop
     - run `node "${CLAUDE_PLUGIN_ROOT}/scripts/action-check.mjs" generator_build_parallel`
     - if the check fails, re-dispatch the final integrator with the repair reason and do not advance state
     - then edit `.harness/status.md` so status becomes:
       - `phase=QA`
       - `pending_action=evaluator_qa_parallel`
       - `last_agent=generator`
       - `approval_required=false`
       - `workflow_mode=parallel`
   - `generator_fix_parallel`
     - read the active QA or retest report
     - collect every unresolved bug ID from `## Bugs` or `## Remaining Bugs`
     - split them into 1-4 temporary fix batches and record those batches as `node_definitions` in `## Parallel Execution State`
     - loop until all batches are merged or a blocker must be surfaced:
       - compute ready batches with `node "${CLAUDE_PLUGIN_ROOT}/scripts/parallel-state.mjs" ready`
      - create one branch and one worktree per ready batch
      - run `worktree-manager.mjs add`
      - mark the batch `active`
      - run `worktree-manager.mjs snapshot`
      - dispatch `auto-harness:generator-fix-worker-agent` bound to that worktree/cwd
       - when workers return with commits, mark them `merge_ready` and append them to `merge_queue`
       - whenever `merge_queue` is non-empty, dispatch `auto-harness:generator-fix-integrator-agent` in the main project root
       - the integrator must merge queued branches and only write `.harness/qa/sprint-XX-fix-log.md` plus any runtime updates when all batches are merged
       - update `## Parallel Execution State`
       - remove merged worktrees
       - retry one failed merge once; mark double-failures `blocked` and stop
     - run `node "${CLAUDE_PLUGIN_ROOT}/scripts/action-check.mjs" generator_fix_parallel`
     - if the check fails, re-dispatch the final integrator with the repair reason and do not advance state
     - then edit `.harness/status.md` so status becomes:
       - `phase=QA`
       - `pending_action=evaluator_retest_parallel`
       - `last_agent=generator`
       - `approval_required=false`
       - `workflow_mode=parallel`
10. If the current `pending_action` is not a Generator-side parallel action, do not overreach. Tell the user the next step should be `/auto-harness:qa` or `/auto-harness:harness-parallel`.
