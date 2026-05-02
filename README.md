# Auto-Harness

[English](README.md) | [Chinese](README.zh-CN.md)

Auto-Harness is a Claude Code plugin for longer software tasks that need planning, implementation, QA, fixes, retests, and a final report.

Give it a product brief. It turns the work into a durable project workflow, asks clarification questions when needed, drafts a spec for your approval, implements sprint by sprint, evaluates the result, and keeps the trail on disk.

It is inspired by Anthropic's article [Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps).

## Which Command Should I Use?

If you are not sure, use the normal serial workflow:

```text
/auto-harness:harness <your product brief>
```

Use the parallel workflow only when the project is a Git repository and the sprint can be split into independent workstreams:

```text
/auto-harness:harness-parallel <your product brief>
```

Serial state lives in `.harness/`. Parallel state lives in `.harness-parallel/`. The two workflows do not share status files, so you can keep them separate in the same project.

## Workflow

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

Generator agents implement. Evaluator agents review contracts, run QA, retest fixes, and write the final assessment.

## Install

Open Claude Code in the project you want Auto-Harness to work on.

```text
/plugin marketplace add redker56/auto-harness
/plugin install auto-harness@auto-harness-marketplace
```

Restart Claude Code after installing the plugin.

## Commands

| Command | Use it for |
| --- | --- |
| `/auto-harness:plan <brief-or-reply>` | Run only serial planning: intake, clarification, spec, and design direction |
| `/auto-harness:plan-parallel <brief-or-reply>` | Run only parallel planning in `.harness-parallel/` |
| `/auto-harness:harness <brief-or-reply>` | Run or resume the serial end-to-end workflow |
| `/auto-harness:harness-parallel <brief-or-reply>` | Run or resume the parallel end-to-end workflow |
| `/auto-harness:build [sprint]` | Advance serial Generator work |
| `/auto-harness:build-parallel [sprint]` | Advance parallel Generator work |
| `/auto-harness:qa [sprint]` | Advance serial Evaluator work: review, QA, retest, or final report |
| `/auto-harness:qa-parallel [sprint]` | Advance parallel Evaluator work |

Most users can stay with `/auto-harness:harness`. Use `/auto-harness:harness-parallel` when you specifically want git worktree based parallel implementation.

## What It Creates

Serial workflow files:

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

Parallel workflow files use the same structure under `.harness-parallel/`.

Useful files:

| File | What it contains |
| --- | --- |
| `intake.md` | Clarified requirements and constraints |
| `spec.md` | Approved product plan and sprint breakdown |
| `design-direction.md` | UI, UX, and product direction |
| `contracts/sprint-XX-contract.md` | What the current sprint must implement |
| `contracts/sprint-XX-review.md` | Whether the sprint contract is ready for implementation |
| `runtime.md` | How Evaluator should install, start, and check the app |
| `qa/sprint-XX-qa-report.md` | QA findings for a sprint |
| `qa/sprint-XX-fix-log.md` | Fixes applied after failed QA |
| `qa/sprint-XX-retest.md` | Retest results after fixes |
| `final/qa-final-report.md` | Final project assessment |

## Parallel Mode

Parallel mode uses git worktrees for Generator build and fix work.

For build work:

- the sprint contract includes a machine-readable dependency graph
- ready graph nodes are assigned to worker agents
- each worker runs in a dedicated git worktree
- each worker commits its changes
- an integrator merges completed worker branches into the main worktree
- runtime and self-check artifacts are written after all build nodes are merged

For fix work:

- Auto-Harness reads bug IDs from the normal QA or retest report
- bugs are split into temporary fix batches
- workers fix assigned batches in separate worktrees
- an integrator merges completed branches and writes the fix log

Parallel mode can be faster when workstreams are independent. If the sprint is tightly coupled, use the serial workflow.

## Resuming Work

Run the same workflow command again from the same project:

```text
/auto-harness:harness
```

or:

```text
/auto-harness:harness-parallel
```

Serial commands resume from `.harness/status.md`. Parallel commands resume from `.harness-parallel/status.md`.

## Requirements

- Claude Code installed and authenticated
- Node.js available on `PATH`
- a project directory where Auto-Harness can write its state folder
- a Git repository for parallel mode
- Playwright MCP support when you want browser-based QA

The plugin includes `.mcp.json` configured to launch:

```text
npx -y @playwright/mcp@latest
```

## License

See [LICENSE](LICENSE).
