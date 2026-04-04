# Auto-Harness

Auto-Harness is a local Claude Code plugin for long-running implementation loops. It keeps the main thread focused on orchestration while fresh `Planner`, `Generator`, and `Evaluator` subagents coordinate through durable `.harness/` artifacts instead of chat memory.

The design goal is simple: planning, implementation, QA, fixes, and resume/recovery should survive long sessions, compaction, and context resets without turning the main thread into a giant prompt dump.

At a glance, the plugin is built around three ideas:

- the main thread orchestrates, but does not write product code or QA verdicts
- sprint work is negotiated through file-backed contracts before implementation
- Evaluator must verify the primary path from the running app before a sprint can pass

## What It Gives You

- A strict three-role workflow: `Planner`, `Generator`, `Evaluator`
- A durable project state directory at `.harness/`
- A contract-first sprint loop with review before implementation
- Browser-capable QA through Playwright MCP on the Evaluator side
- Session resume support through hooks and checkpoint snapshots
- Shared guidance modules so agent kernels stay small and role-pure

## Runtime Model

### Main Thread: Orchestrator

The main thread only does these things:

- reads project state from `.harness/`
- decides which phase comes next
- dispatches fresh subagents
- updates `.harness/status.md`
- talks to the user directly when clarification or approval is needed

The main thread does not draft the spec, write app code, or make QA judgments.

### Planner

`Planner` is a fresh subagent used for:

- clarification intake
- locked architecture and stack decisions
- sprint planning
- design-direction drafting

`Planner` writes only inside `.harness/`.

### Generator

`Generator` is a fresh subagent used for:

- sprint contract drafting
- implementation
- defect fixes after QA

`Generator` writes code and the Generator-owned `.harness/` artifacts, but it never updates status, review files, QA reports, retest reports, or the final report.

### Evaluator

`Evaluator` is a fresh subagent used for:

- contract review
- runtime QA
- retest after fixes
- final reporting

`Evaluator` is intentionally read-only with respect to application code. It judges the running app and the named artifacts rather than trusting Generator intent.

## End-To-End Flow

```text
User brief
  -> Orchestrator
  -> Planner clarification questionnaire
  -> user answers inline in chat
  -> Planner spec + design direction
  -> user approves or requests revisions
  -> Generator contract draft
  -> Evaluator contract review
  -> Generator build
  -> Evaluator QA
  -> if FAIL: Generator fix -> Evaluator retest
  -> next sprint or final report
```

The user interaction happens in chat. `.harness/*.md` is the durable log, not a document the user is forced to manually inspect just to continue.

## Quick Start

### Prerequisites

- Claude Code installed and authenticated
- Node.js available on `PATH`
- a target project directory where Auto-Harness is allowed to create `.harness/`
- Playwright MCP support if you want browser QA

If you do not see plugin-related commands in Claude Code, update Claude Code first.

### Install From GitHub

1. Open Claude Code in the project where you want to use Auto-Harness.
2. Add the GitHub repository as a plugin marketplace:

```text
/plugin marketplace add <github-owner>/<repo>
```

1. Install the plugin from that marketplace:

```text
/plugin install auto-harness@auto-harness-marketplace
```

1. Restart Claude Code so the newly installed plugin is loaded.
2. Run the main command:

```text
/auto-harness:harness Build a small internal dashboard for support agents with search, ticket detail, and activity history.
```

1. Answer the clarification questions inline in chat.
2. Approve the generated spec inline in chat, or reply with revisions.
3. Let the sprint loop continue until the final report is produced.

The marketplace name in this repository is `auto-harness-marketplace`. Replace `<github-owner>/<repo>` with the published GitHub repository, for example `your-name/auto-harness`.

### For Local Development

If you are developing or testing the plugin locally before publishing it, load it with `--plugin-dir` instead:

```bash
claude --plugin-dir /absolute/path/to/auto-harness
```

When you change plugin files during development, reload without restarting:

```text
/reload-plugins
```

Because this is a plugin, its commands are namespaced by the plugin name:

- `/auto-harness:harness`
- `/auto-harness:plan`
- `/auto-harness:build`
- `/auto-harness:qa`

### Minimal Operator Mental Model

- use `/auto-harness:harness` for the normal end-to-end loop
- use `/auto-harness:plan` when you only want intake and spec work
- use `/auto-harness:build` when you want to advance Generator-side work only
- use `/auto-harness:qa` when you want to advance Evaluator-side work only

## Commands

### `/auto-harness:harness <brief-or-reply>`

The default command. It can handle:

- the initial product brief
- clarification answers
- spec approval
- later resume of the current sprint state

Use this when you want the orchestrator to choose the next legal step automatically and keep advancing through multiple legal steps in the same invocation until it hits a user-blocking state, a structurally invalid QA report, or `DONE`. Subagent or artifact failure should be treated as an internal recovery problem for the orchestrator to solve within the same loop, not as a reason to stop.

### `/auto-harness:plan <brief-or-clarification-answers>`

Planning-only mode. It can:

- bootstrap `.harness/intake.md`
- ask clarification questions
- draft `.harness/spec.md`
- draft `.harness/design-direction.md`

It stops at spec approval and does not enter the sprint loop.

### `/auto-harness:build [XX]`

Generator-side mode. It auto-selects the current legal Generator action from `.harness/status.md`:

- contract drafting
- build
- fix

Use it when you want to continue implementation work without running the full harness loop.

### `/auto-harness:qa [XX]`

Evaluator-side mode. It auto-selects the current legal Evaluator action from `.harness/status.md`:

- contract review
- QA
- retest
- final reporting

Use it when you want to re-run verification after manual edits or resume the QA side only.

## `.harness/` Artifact Contract

Auto-Harness creates a per-project state directory:

```text
.harness/
|-- intake.md
|-- spec.md
|-- design-direction.md
|-- status.md
|-- runtime.md
|-- checkpoints/
|   `-- latest.md
|-- contracts/
|   |-- sprint-01-contract.md
|   `-- sprint-01-review.md
|-- qa/
|   |-- sprint-01-self-check.md
|   |-- sprint-01-qa-report.md
|   |-- sprint-01-fix-log.md
|   `-- sprint-01-retest.md
`-- final/
    `-- qa-final-report.md
```

### Ownership By File

| Artifact | Owner | Purpose |
| --- | --- | --- |
| `.harness/intake.md` | Planner | Clarified requirements, locked decisions, constraints, selected pack, selected rubric |
| `.harness/spec.md` | Planner | Approved implementation plan and sprint breakdown |
| `.harness/design-direction.md` | Planner | UI, interaction, or product direction that Generator should follow |
| `.harness/status.md` | Orchestrator | Machine-readable state source of truth |
| `.harness/runtime.md` | Generator | Runtime contract for launching and verifying the app |
| `.harness/contracts/sprint-XX-contract.md` | Generator | Proposed sprint implementation contract |
| `.harness/contracts/sprint-XX-review.md` | Evaluator | Contract review result, including required revisions |
| `.harness/qa/sprint-XX-self-check.md` | Generator | Generator self-check before QA handoff |
| `.harness/qa/sprint-XX-qa-report.md` | Evaluator | Sprint QA result |
| `.harness/qa/sprint-XX-fix-log.md` | Generator | Fixes applied after a failed QA run |
| `.harness/qa/sprint-XX-retest.md` | Evaluator | Retest result after fixes |
| `.harness/final/qa-final-report.md` | Evaluator | End-of-run final assessment |
| `.harness/checkpoints/latest.md` | Hook/script | Resume snapshot used during session restart or compaction |

## Status Model

`.harness/status.md` frontmatter is the state source of truth. The helper scripts and hooks expect fields like:

```yaml
phase: CONTRACTING
current_sprint: 1
total_sprints: 3
pending_action: evaluator_review
last_agent: generator
approval_required: false
selected_pack: default
selected_rubric: default-grading
updated_at: 2026-04-04T12:00:00.000Z
```

### Typical Phases

- `AWAITING_BRIEF_CLARIFICATION`
- `AWAITING_SPEC_APPROVAL`
- `CONTRACTING`
- `BUILDING`
- `QA`
- `FIXING`
- `DONE`

### Typical Pending Actions

- `brief_clarification`
- `spec_approval`
- `generator_contract`
- `evaluator_review`
- `generator_build`
- `evaluator_qa`
- `generator_fix`
- `evaluator_retest`
- `evaluator_final`

The command layer uses `phase`, `current_sprint`, `total_sprints`, and `pending_action` to determine the next legal action. This prevents users or subagents from skipping unfinished stages.

## Repository Layout

```text
auto-harness/
|-- .claude-plugin/
|   `-- plugin.json
|-- agents/
|   |-- planner.md
|   |-- generator.md
|   `-- evaluator.md
|-- commands/
|   |-- harness.md
|   |-- plan.md
|   |-- build.md
|   `-- qa.md
|-- hooks/
|   `-- hooks.json
|-- scripts/
|   |-- harness-hook.mjs
|   |-- harness-lib.mjs
|   |-- harness-report.mjs
|   |-- harness-runtime.mjs
|   `-- harness-state.mjs
|-- modules/
|   |-- protocols/
|   |-- templates/
|   |-- rubrics/
|   |-- clarification/
|   |-- catalogs/
|   `-- packs/
|-- .mcp.json
`-- README.md
```

## Module Library

`modules/` is the shared operating library. The agent kernels stay intentionally small and pull their real operating guidance from these reusable modules.

- `modules/protocols/`: role boundaries, contracts, file ownership rules
- `modules/templates/`: output templates for intake, spec, contracts, reports, and runtime
- `modules/rubrics/`: grading criteria used by Evaluator
- `modules/clarification/`: question families and clarification strategy for Planner
- `modules/catalogs/`: architecture and stack option catalogs
- `modules/packs/`: reusable opinion bundles such as `default`, `internal-tool`, `mobile-first`, and stack-specific packs

Planner receives protocols, clarification guidance, catalogs, templates, and packs. Generator receives protocols, implementation templates, and packs. Evaluator receives protocols, rubrics, evaluation templates, and packs.

Module injection is discovered automatically from `modules/` by directory and `applies_to` frontmatter. If you add a new module file with the correct `applies_to` value, it becomes live without patching a hardcoded file list.

## Hooks And Resume Behavior

`hooks/hooks.json` wires three lifecycle events:

- `SessionStart`: reads `.harness/status.md`, includes a checkpoint excerpt, and reminds the session to resume instead of restarting planning
- `SubagentStart`: injects role-specific operating guidance assembled from `modules/`
- `PreCompact`: refreshes `.harness/checkpoints/latest.md` before compaction

This is what makes Auto-Harness resilient to long sessions and context compaction.

## Playwright MCP

The plugin ships a local `.mcp.json` that starts Playwright through:

```text
npx -y @playwright/mcp@latest
```

In practice:

- Planner and Generator are kept away from MCP-driven browser work
- Evaluator inherits MCP access and can use it for browser QA
- Evaluator can also call the runtime helper to perform health checks before or during QA

## Helper Scripts

### State Helper

Read the current status document:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/harness-state.mjs" get
```

Print a short summary:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/harness-state.mjs" summary
```

Update specific frontmatter keys:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/harness-state.mjs" set phase=QA pending_action=evaluator_qa
```

Refresh the checkpoint snapshot:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/harness-state.mjs" checkpoint auto
```

All state commands default to the current working directory as the project root. You can also pass an explicit project root before the key-value pairs.

### Runtime Helper

Read `.harness/runtime.md`:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/harness-runtime.mjs" get
```

Run an HTTP health check:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/harness-runtime.mjs" healthcheck
```

The health check currently expects:

- `healthcheck_method: http-get`
- `healthcheck_url`, or `access_url` as a fallback

### QA Report Helper

Validate the current sprint QA report structure:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/harness-report.mjs" qa validate
```

Read the validated PASS/FAIL result:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/harness-report.mjs" qa result
```

This helper checks that the QA report includes the required sections and tables:

- `Result`
- `Primary Path Exercise`
- `Contract Behaviors`
- `Bugs`
- `Hard-Fail Gates`
- `Scorecard`
- `Verdict`

## Design Rules

- The main thread stays orchestration-only.
- Every delegation uses a fresh subagent.
- Important decisions go into files, not chat history.
- Generator cannot implement before contract approval.
- Evaluator judges outcomes from files and runtime behavior, not from optimistic explanations.
- Resume should continue from `.harness/status.md`, not restart the entire planning loop.

## When To Reach For It

Auto-Harness is most useful when:

- the task will take multiple rounds or multiple sprints
- the project needs durable planning artifacts
- you want a clean separation between implementation and QA judgment
- you expect session restarts, compaction, or interrupted work
- browser verification matters

It is probably overkill for tiny one-shot edits where a single direct coding pass is enough.
