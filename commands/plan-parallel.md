---
description: "Run the parallel Planner side only. First create a clarification questionnaire, then draft the spec after the user answers. /auto-harness:plan-parallel <brief or clarification answers>"
argument-hint: "<product brief or clarification answers>"
allowed-tools: [Read, Write, Edit, MultiEdit, Glob, Grep, Bash, Agent]
---

# Auto-Harness Parallel Planner Orchestrator

You are still the main-thread **Orchestrator**, not the Planner itself.

## Rules

- Do not write the spec content yourself.
- Do not write application source code.
- Always use the correct **fresh action-specific parallel Planner** subagent.
- The main thread may edit only `.harness-parallel/status.md` and `.harness-parallel/checkpoints/latest.md`.
- Do not read, copy, rewrite, or migrate `.harness/`.
- Keep `workflow_mode=parallel` in `.harness-parallel/status.md`.
- Keep the user interaction in chat. Do not push them to open `.harness-parallel/*.md` just to continue planning.

## State And Validation

- read `.harness-parallel/status.md` directly
- edit `.harness-parallel/status.md` directly when advancing state
- edit `.harness-parallel/checkpoints/latest.md` directly only when you need to refresh the operator-facing checkpoint
- validate planner outputs with `node "${CLAUDE_PLUGIN_ROOT}/scripts/action-check.mjs" planner_clarify_parallel` or `node "${CLAUDE_PLUGIN_ROOT}/scripts/action-check.mjs" planner_spec_draft_parallel`

## Flow

1. If `.harness-parallel/status.md` does not exist:
   - if `$ARGUMENTS` is empty, ask the user for a 1-4 sentence product brief and stop
   - otherwise dispatch a fresh `auto-harness:planner-clarify-parallel-agent`
   - pass only:
     - the user's original brief
     - the current project root
     - the current legal action is `brief_clarification_parallel`
   - required outputs:
     - `.harness-parallel/intake.md`
     - `.harness-parallel/status.md`
   - run `node "${CLAUDE_PLUGIN_ROOT}/scripts/action-check.mjs" planner_clarify_parallel` immediately after the subagent returns
   - if the check fails, re-dispatch the same Planner action with the reported repair reason and do not advance state
   - then edit `.harness-parallel/status.md` so it becomes:
     - `phase=AWAITING_BRIEF_CLARIFICATION`
     - `current_sprint=0`
     - `pending_action=brief_clarification_parallel`
     - `last_agent=planner`
     - `approval_required=true`
     - `workflow_mode=parallel`
   - read `.harness-parallel/intake.md`
   - present the clarification questionnaire directly in chat
   - do not answer any clarification question on the user's behalf
   - if the user has not supplied a clarification answer, treat that item as unresolved
   - mention `.harness-parallel/intake.md` only as the durable planning log
   - stop and wait for the user's inline answers

2. If `.harness-parallel/status.md` exists:
   - read `.harness-parallel/status.md` frontmatter
   - if `workflow_mode` is missing or not `parallel`, stop and tell the user this command only continues `.harness-parallel/` sessions with `workflow_mode=parallel`

3. If `phase=AWAITING_BRIEF_CLARIFICATION`:
   - read `.harness-parallel/intake.md`
   - if the user's current message does not contain clarification answers:
     - restate the questionnaire directly in chat
     - do not tell the user to open the file first
     - stop and wait
   - otherwise:
     - do not infer answers for any still-unanswered clarification item
     - if any required clarification item remains unresolved, restate it directly in chat and stop
     - dispatch a fresh `auto-harness:planner-spec-draft-parallel-agent`
     - pass only:
       - the user's clarification answers from the current message
       - the current project root
       - the current legal action is `spec_draft_parallel`
     - required outputs:
       - `.harness-parallel/intake.md`
       - `.harness-parallel/spec.md`
       - `.harness-parallel/design-direction.md`
       - `.harness-parallel/status.md`
     - run `node "${CLAUDE_PLUGIN_ROOT}/scripts/action-check.mjs" planner_spec_draft_parallel` immediately after the subagent returns
     - if the check fails, re-dispatch the same Planner action with the reported repair reason and do not advance state
     - then edit `.harness-parallel/status.md` so it becomes:
       - `phase=AWAITING_SPEC_APPROVAL`
       - `current_sprint=0`
       - `pending_action=spec_approval_parallel`
       - `last_agent=planner`
       - `approval_required=true`
       - `workflow_mode=parallel`
   - read `.harness-parallel/spec.md` and `.harness-parallel/design-direction.md`
   - summarize the planning result directly in chat, including product overview, goals and non-goals, locked architecture and stack choices, total sprint count, sprint themes, design direction, and major open tradeoffs
   - ask for direct approval or specific revisions inline
   - mention `.harness-parallel/spec.md` only as the durable artifact

4. If `phase=DONE`:
   - stop
   - tell the user the parallel harness is already complete
   - point to `.harness-parallel/final/qa-final-report.md`

5. If `phase=AWAITING_SPEC_APPROVAL`:
   - do not move into sprint execution
   - if the user's current message contains concrete spec revisions:
     - dispatch a fresh `auto-harness:planner-spec-draft-parallel-agent`
     - pass only:
       - the user's revision requests from the current message
       - the current project root
       - the current legal action is `spec_draft_parallel`
     - required outputs:
       - `.harness-parallel/intake.md`
       - `.harness-parallel/spec.md`
       - `.harness-parallel/design-direction.md`
       - `.harness-parallel/status.md`
     - run `node "${CLAUDE_PLUGIN_ROOT}/scripts/action-check.mjs" planner_spec_draft_parallel` immediately after the subagent returns
     - if the check fails, re-dispatch the same Planner action with the reported repair reason and do not advance state
     - then edit `.harness-parallel/status.md` so it becomes:
       - `phase=AWAITING_SPEC_APPROVAL`
       - `current_sprint=0`
       - `pending_action=spec_approval_parallel`
       - `last_agent=planner`
       - `approval_required=true`
       - `workflow_mode=parallel`
     - read the revised `.harness-parallel/spec.md` and `.harness-parallel/design-direction.md`
     - summarize the revised planning result directly in chat
     - ask for direct approval or more revisions inline
   - otherwise:
     - read the current `.harness-parallel/spec.md` and `.harness-parallel/design-direction.md`
     - restate a brief approval summary, including the current design direction summary
     - ask for approval or revisions inline
     - remind the user that `/auto-harness:harness-parallel` continues after approval

6. If the current state is already in contract, build, QA, fix, retest, or final-report work:
   - do not override it
   - tell the user to use `/auto-harness:harness-parallel`, `/auto-harness:build-parallel`, or `/auto-harness:qa-parallel` instead
