# Auto-Harness

[English](README.md) | [中文](README.zh-CN.md)

This plugin is based on Anthropic's article, [Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps).

Auto-Harness is a Claude Code plugin for long-running application work. It turns planning, implementation, QA, fix loops, and resume/recovery into a file-backed workflow under `.harness/` while keeping the main thread role-pure.

- `commands/` serve as the control plane
- `agents/` are action-specific subagents, one legal harness action per agent
- `skills/` hold action-specific behavior such as `planner-clarify` and `evaluator-write-qa`
- `hooks/` enforce runtime boundaries and resume behavior at the plugin root
- `scripts/` provide state, runtime, post-run action checks, root guards, and checkpoint helpers

## What It Gives You

- A strict action-specific workflow across the `Planner`, `Generator`, and `Evaluator` roles
- A durable project state directory at `.harness/`
- A contract-first sprint loop with review before implementation
- Browser-capable QA through Playwright MCP on the Evaluator side
- Session resume support through hooks and checkpoint snapshots
- Internal action skills so subagent behavior is narrow, explicit, and easier to evolve

## Runtime Model

### Main Thread: Orchestrator

The main thread does these things:

- reads project state from `.harness/`
- decides which phase comes next
- dispatches fresh subagents
- advances `.harness/status.md` through helper scripts
- talks to the user directly when clarification or approval is needed

The main thread does not draft the spec, write app code, or make QA judgments.

### Action-Specific Subagents

Auto-Harness dispatches one focused subagent per legal harness action:

- `planner-clarify-agent`
- `planner-spec-draft-agent`
- `generator-draft-contract-agent`
- `generator-build-sprint-agent`
- `generator-apply-fixes-agent`
- `evaluator-review-contract-agent`
- `evaluator-write-qa-agent`
- `evaluator-write-retest-agent`
- `evaluator-write-final-agent`
- `qa-report-reviewer-agent`
- `retest-report-reviewer-agent`
- `final-report-reviewer-agent`

Writer agents preload exactly one internal skill and read the current project `.harness/` state for themselves. Reviewer agents use prompt-based review and audit QA/retest/final reports against embedded rubric and template requirements. Internal skills carry behavior guidance. Runtime enforcement lives at the plugin root.

## End-To-End Flow

```text
User brief
  -> Orchestrator
  -> planner-clarify-agent
  -> user answers inline in chat
  -> planner-spec-draft-agent
  -> user approves or requests revisions
  -> generator-draft-contract-agent
  -> evaluator-review-contract-agent
  -> generator-build-sprint-agent
  -> evaluator-write-qa-agent -> qa-report-reviewer-agent
  -> if FAIL: generator-apply-fixes-agent -> evaluator-write-retest-agent -> retest-report-reviewer-agent
  -> evaluator-write-final-agent -> final-report-reviewer-agent
  -> next sprint or final report
```

User interaction happens in chat. `.harness/*.md` is the durable log.

## Quick Start

### Prerequisites

- Claude Code installed and authenticated
- Node.js available on `PATH`
- a target project directory where Auto-Harness is allowed to create `.harness/`
- Playwright MCP support if you want browser QA

### Install From GitHub

1. Open Claude Code in the project where you want to use Auto-Harness.
2. Add the repository as a plugin marketplace:

```text
/plugin marketplace add redker56/auto-harness
```

1. Install the plugin:

```text
/plugin install auto-harness@auto-harness-marketplace
```

1. Restart Claude Code.
2. Run:

```text
/auto-harness:harness <your product brief or clarification reply>
```

### Minimal Operator Mental Model

- use `/auto-harness:harness` for the normal end-to-end loop
- use `/auto-harness:plan` when you want intake and spec work
- use `/auto-harness:build` when you want to advance Generator-side work
- use `/auto-harness:qa` when you want to advance Evaluator-side work

## Commands

### `/auto-harness:harness <brief-or-reply>`

The default command. It can handle:

- the initial product brief
- clarification answers
- spec approval
- later resume of the current sprint state

### `/auto-harness:plan <brief-or-clarification-answers>`

Planning mode. It can:

- bootstrap `.harness/intake.md`
- ask clarification questions
- draft `.harness/spec.md`
- draft `.harness/design-direction.md`

### `/auto-harness:build [XX]`

Generator-side mode. It auto-selects the current legal Generator action from `.harness/status.md`:

- contract drafting
- build
- fix

### `/auto-harness:qa [XX]`

Evaluator-side mode. It auto-selects the current legal Evaluator action from `.harness/status.md`:

- contract review
- QA
- retest
- final reporting

## `.harness/` Artifact Contract

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
| `.harness/intake.md` | Planner | Clarified requirements, locked decisions, constraints, and selected pack |
| `.harness/spec.md` | Planner | Approved implementation plan and sprint breakdown |
| `.harness/design-direction.md` | Planner | UI, interaction, or product direction that Generator should follow |
| `.harness/status.md` | Planner + Orchestrator | Machine-readable state source of truth initialized by Planner and advanced by Orchestrator |
| `.harness/runtime.md` | Generator | Runtime contract for launching and verifying the app |
| `.harness/contracts/sprint-XX-contract.md` | Generator | Proposed sprint implementation contract |
| `.harness/contracts/sprint-XX-review.md` | Evaluator | Contract review result |
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
```

Typical phases:

- `AWAITING_BRIEF_CLARIFICATION`
- `AWAITING_SPEC_APPROVAL`
- `CONTRACTING`
- `BUILDING`
- `QA`
- `FIXING`
- `DONE`

Typical pending actions:

- `brief_clarification`
- `spec_draft`
- `spec_approval`
- `generator_contract`
- `evaluator_review`
- `generator_build`
- `evaluator_qa`
- `generator_fix`
- `evaluator_retest`
- `evaluator_final`

## Repository Layout

```text
auto-harness/
|-- .claude-plugin/
|   |-- marketplace.json
|   `-- plugin.json
|-- agents/
|   |-- planner-clarify-agent.md
|   |-- planner-spec-draft-agent.md
|   |-- generator-draft-contract-agent.md
|   |-- generator-build-sprint-agent.md
|   |-- generator-apply-fixes-agent.md
|   |-- evaluator-review-contract-agent.md
|   |-- evaluator-write-qa-agent.md
|   |-- evaluator-write-retest-agent.md
|   |-- evaluator-write-final-agent.md
|   |-- qa-report-reviewer-agent.md
|   |-- retest-report-reviewer-agent.md
|   `-- final-report-reviewer-agent.md
|-- commands/
|   |-- harness.md
|   |-- plan.md
|   |-- build.md
|   `-- qa.md
|-- hooks/
|   `-- hooks.json
|-- scripts/
|   |-- action-check.mjs
|   |-- harness-hook.mjs
|   |-- harness-lib.mjs
|   |-- harness-runtime.mjs
|   |-- root-guard.mjs
|   `-- harness-state.mjs
|-- bin/
|   |-- harness-check-action
|   |-- harness-check-action.cmd
|   |-- harness-state
|   `-- harness-state.cmd
|-- skills/
|   |-- planner-clarify/
|   |-- planner-spec-draft/
|   |-- generator-draft-contract/
|   |-- generator-build-sprint/
|   |-- generator-apply-fixes/
|   |-- evaluator-review-contract/
|   |-- evaluator-write-qa/
|   |-- evaluator-write-retest/
|   `-- evaluator-write-final/
|-- .mcp.json
|-- LICENSE
|-- README.md
`-- README.zh-CN.md
```

## Internal Skills

Each writer subagent action is backed by an internal skill with its own supporting files.

Examples:

- `planner-clarify`: clarification intake
- `generator-build-sprint`: approved sprint implementation
- `evaluator-write-qa`: QA execution plus QA report drafting guidance

These skills are internal:

- not shown as user-facing workflow commands
- not intended for direct operator use
- preloaded by the matching subagent kernel
- responsible for action-specific rules, templates, packs, and report-writing guidance

## Hooks And Resume Behavior

The plugin uses plugin-root hooks:

- `SessionStart`: reads `.harness/status.md`, includes a checkpoint excerpt, and resumes the active harness session from the recorded state
- `PreCompact`: refreshes `.harness/checkpoints/latest.md` before compaction
- `PreToolUse`: enforces all repo write boundaries from the plugin root using `.harness/status.md` as the legal-action source of truth
- `SubagentStart` / `SubagentStop`: track active Auto-Harness subagents for observability and root-hook enforcement

Completion checks use:

- Planner, Generator, and contract-review outputs are validated explicitly by `harness-check-action`
- QA, retest, and final reports are audited by explicit reviewer agents
- The Orchestrator advances state after those checks succeed

## Playwright MCP

The plugin ships a `.mcp.json` that starts Playwright through:

```text
npx -y @playwright/mcp@latest
```

In practice:

- Planner and Generator stay away from MCP-driven browser work
- Evaluator inherits MCP access for browser QA
- Evaluator can also call the runtime helper to perform health checks before or during QA

## Helper Scripts

### State Helper

```text
node "${CLAUDE_PLUGIN_ROOT}/scripts/harness-state.mjs" get
node "${CLAUDE_PLUGIN_ROOT}/scripts/harness-state.mjs" summary
node "${CLAUDE_PLUGIN_ROOT}/scripts/harness-state.mjs" set key=value ...
node "${CLAUDE_PLUGIN_ROOT}/scripts/harness-state.mjs" checkpoint auto
```

### Action Check Helper

```text
node "${CLAUDE_PLUGIN_ROOT}/scripts/action-check.mjs" planner_clarify
node "${CLAUDE_PLUGIN_ROOT}/scripts/action-check.mjs" planner_spec_draft
node "${CLAUDE_PLUGIN_ROOT}/scripts/action-check.mjs" generator_contract
node "${CLAUDE_PLUGIN_ROOT}/scripts/action-check.mjs" generator_build
node "${CLAUDE_PLUGIN_ROOT}/scripts/action-check.mjs" generator_fix
node "${CLAUDE_PLUGIN_ROOT}/scripts/action-check.mjs" evaluator_review
```

### Runtime Helper

```text
node "${CLAUDE_PLUGIN_ROOT}/scripts/harness-runtime.mjs" get
node "${CLAUDE_PLUGIN_ROOT}/scripts/harness-runtime.mjs" healthcheck
```


