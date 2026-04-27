# Auto-Harness

[English](README.md) | [Chinese](README.zh-CN.md)

Auto-Harness is a Claude Code plugin for running longer software tasks as a durable workflow instead of one long chat.

Give it a product brief. It plans the work, asks for clarification, drafts a spec, implements sprint by sprint, runs QA, applies fixes, retests, and writes a final report. The workflow is stored in `.harness/`, so you can inspect progress, resume later, and read the project trail.

It is inspired by Anthropic's article [Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps).

## When To Use It

Use Auto-Harness when:

- you want Claude Code to deliver a feature across multiple sprints
- you want planning, implementation, and evaluation handled by separate roles
- you want QA and fix/retest to happen by default
- you want durable files you can read, diff, and resume from
- you want the project state to survive context compaction or a later session

For one-line edits or small bug fixes, a normal Claude Code conversation is usually lighter.

## Workflow

The default workflow is:

```text
brief
  -> clarification
  -> spec draft
  -> user approval
  -> sprint contract
  -> contract review
  -> implementation
  -> QA
  -> fix and retest when needed
  -> final report
```

You interact in chat. Auto-Harness writes the durable workflow state into `.harness/`.

## Execution Modes

### Stable Mode

Use stable mode for normal project work:

```text
/auto-harness:harness <your product brief>
```

Stable mode runs Generator work serially. It is the safest option and the recommended default.

### Parallel Mode

Use parallel mode when a sprint can be split into independent implementation slices:

```text
/auto-harness:harness-parallel <your product brief>
```

Parallel mode uses git worktrees for Generator build/fix work. Worker agents make commits in isolated worktrees, and an integrator agent merges the finished branches back into the main worktree.

Parallel mode is best for Git repositories with clear file boundaries. If the work is tightly coupled, stable mode is usually a better fit.

## Quick Start

### Prerequisites

- Claude Code installed and authenticated
- Node.js available on `PATH`
- a target project directory where `.harness/` can be created
- a Git repository when using parallel mode
- Playwright MCP support when you want browser-based QA

### Install

Open Claude Code in the project you want Auto-Harness to work on.

```text
/plugin marketplace add redker56/auto-harness
/plugin install auto-harness@auto-harness-marketplace
```

Restart Claude Code after installing the plugin.

### Run

For the stable workflow:

```text
/auto-harness:harness Build a small issue tracker with projects, tickets, status changes, and a QA-ready UI.
```

For the parallel workflow:

```text
/auto-harness:harness-parallel Build a small issue tracker with projects, tickets, status changes, and a QA-ready UI.
```

Auto-Harness will ask clarification questions when needed. Answer in chat, then approve or revise the generated spec before implementation begins.

## Commands

| Command | Use it for |
| --- | --- |
| `/auto-harness:harness <brief-or-reply>` | Run or resume the stable end-to-end workflow |
| `/auto-harness:harness-parallel <brief-or-reply>` | Run or resume the parallel end-to-end workflow |
| `/auto-harness:plan <brief-or-reply>` | Work only on intake, clarification, spec, and design direction |
| `/auto-harness:build [sprint]` | Advance stable Generator work for the current sprint |
| `/auto-harness:build-parallel [sprint]` | Advance parallel Generator work for the current sprint |
| `/auto-harness:qa [sprint]` | Advance Evaluator work: contract review, QA, retest, or final report |

Most users can stay with `/auto-harness:harness` or `/auto-harness:harness-parallel`.

## What Auto-Harness Creates

Auto-Harness writes its working files under `.harness/` in your project:

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

The most useful files to read are:

| File | What it contains |
| --- | --- |
| `.harness/intake.md` | Clarified requirements and constraints |
| `.harness/spec.md` | Approved product plan and sprint breakdown |
| `.harness/design-direction.md` | UI, UX, and product direction |
| `.harness/contracts/sprint-XX-contract.md` | What the current sprint must implement |
| `.harness/contracts/sprint-XX-review.md` | Whether the sprint contract is ready for implementation |
| `.harness/runtime.md` | How Evaluator should install, start, and check the app |
| `.harness/qa/sprint-XX-qa-report.md` | QA findings for a sprint |
| `.harness/qa/sprint-XX-fix-log.md` | Fixes applied after failed QA |
| `.harness/qa/sprint-XX-retest.md` | Retest results after fixes |
| `.harness/final/qa-final-report.md` | Final project assessment |

## How QA Works

Auto-Harness separates implementation from evaluation:

- Generator writes the implementation and a self-check.
- Evaluator reviews the sprint contract before coding starts.
- Evaluator runs QA against the built result.
- If QA fails, Generator fixes named issues.
- Evaluator retests the named fixes.
- The final report is also reviewed before the workflow is marked complete.

For browser apps, Evaluator can use Playwright MCP to exercise the real UI.

## Parallel Mode Details

Parallel mode is designed for larger sprints where independent work can happen at the same time.

For build work:

- the sprint contract includes a dependency graph
- ready nodes are assigned to worker agents
- each worker runs in a dedicated git worktree
- each worker commits its changes
- an integrator merges completed worker branches
- final runtime and self-check files are written after all build nodes are merged

For fix work:

- QA and retest reports use the normal report format
- Auto-Harness reads the bug table
- bug IDs are split into temporary worker batches
- workers fix their assigned batches in worktrees
- the integrator merges finished branches and writes the fix log

Parallel mode can be faster when workstreams are independent. It can also surface merge conflicts when tasks overlap.

## Resuming Work

Run the same command again from the same project:

```text
/auto-harness:harness
```

or:

```text
/auto-harness:harness-parallel
```

Auto-Harness reads `.harness/status.md` and continues from the next legal step. It also refreshes `.harness/checkpoints/latest.md` before compaction.

## Troubleshooting

If the workflow stops for clarification or approval, answer directly in chat.

If a command says the next step belongs to another mode, use the command it names. For example, Generator-side work can be advanced with `/auto-harness:build`, while Evaluator-side work can be advanced with `/auto-harness:qa`.

If browser QA cannot run, check that Playwright MCP is available. The plugin includes `.mcp.json` configured to launch:

```text
npx -y @playwright/mcp@latest
```

If parallel mode gets blocked by a merge conflict or overlapping edits, continue in the same session so the integrator can report the blockage and the affected worktree.

## License

See [LICENSE](LICENSE).
