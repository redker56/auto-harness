# Auto-Harness

[English](README.md) | [中文](README.zh-CN.md)

Auto-Harness 是一个 Claude Code 插件，用来把较长的软件开发任务变成可恢复、可检查的工作流，而不是一条越聊越长的对话。

你给它一个产品 brief，它会完成需求澄清、规格草案、用户确认、分 sprint 实现、QA、修复重测和最终报告。所有关键状态都会写进项目里的 `.harness/` 目录，方便你随时查看、继续、对比和交接。

这个插件参考了 Anthropic 的文章：[Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps)。

## 适合什么场景

适合使用 Auto-Harness 的情况：

- 你希望 Claude Code 分多个 sprint 交付一个功能
- 你希望规划、实现、评估由不同角色负责
- 你希望 QA、修复和重测成为默认流程
- 你希望产物落在文件里，方便阅读、diff 和恢复
- 你希望任务能跨会话、跨压缩上下文继续推进

如果只是一次很小的改动或简单 bug 修复，普通 Claude Code 对话通常更轻。

## 工作流

默认流程是：

```text
brief
  -> 需求澄清
  -> spec 草案
  -> 用户确认
  -> sprint contract
  -> contract review
  -> 实现
  -> QA
  -> 必要时修复并重测
  -> final report
```

你在 chat 里和 Auto-Harness 互动。`.harness/` 是持久化工作记录。

## 执行模式

### 稳定模式

普通项目建议使用稳定模式：

```text
/auto-harness:harness <你的产品 brief>
```

稳定模式会串行执行 Generator 工作，是最稳妥的默认选择。

### 并行模式

当一个 sprint 可以拆成多个相对独立的实现切片时，可以使用并行模式：

```text
/auto-harness:harness-parallel <你的产品 brief>
```

并行模式会使用 git worktree 执行 Generator 的 build/fix 工作。worker agent 在各自隔离的 worktree 中提交改动，integrator agent 再把完成的分支合回主 worktree。

并行模式更适合 Git 仓库，并且要求任务之间有清晰的文件边界。如果实现高度耦合，稳定模式通常更合适。

## 快速开始

### 前置条件

- 已安装并登录 Claude Code
- `PATH` 中可以使用 Node.js
- 目标项目目录允许创建 `.harness/`
- 使用并行模式时，目标项目最好是 Git 仓库
- 如果需要浏览器 QA，需要 Playwright MCP 支持

### 安装

在你想使用 Auto-Harness 的目标项目中打开 Claude Code。

```text
/plugin marketplace add redker56/auto-harness
/plugin install auto-harness@auto-harness-marketplace
```

安装后重启 Claude Code。

### 运行

稳定工作流：

```text
/auto-harness:harness 做一个小型 issue tracker，支持项目、ticket、状态变更和可 QA 的界面
```

并行工作流：

```text
/auto-harness:harness-parallel 做一个小型 issue tracker，支持项目、ticket、状态变更和可 QA 的界面
```

如果信息不够，Auto-Harness 会先问澄清问题。你在 chat 里回答即可。实现开始前，它会先让你确认或修改 spec。

## 命令

| 命令 | 用途 |
| --- | --- |
| `/auto-harness:harness <brief-or-reply>` | 运行或恢复稳定端到端工作流 |
| `/auto-harness:harness-parallel <brief-or-reply>` | 运行或恢复并行端到端工作流 |
| `/auto-harness:plan <brief-or-reply>` | 只推进 intake、澄清、spec 和设计方向 |
| `/auto-harness:build [sprint]` | 推进当前 sprint 的稳定 Generator 工作 |
| `/auto-harness:build-parallel [sprint]` | 推进当前 sprint 的并行 Generator 工作 |
| `/auto-harness:qa [sprint]` | 推进 Evaluator 工作，包括 contract review、QA、retest 和 final report |

大多数情况下，你只需要使用 `/auto-harness:harness` 或 `/auto-harness:harness-parallel`。

## 会生成什么文件

Auto-Harness 会在项目中写入 `.harness/`：

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

最常看的文件有：

| 文件 | 内容 |
| --- | --- |
| `.harness/intake.md` | 已澄清的需求和约束 |
| `.harness/spec.md` | 已确认的产品计划和 sprint 拆分 |
| `.harness/design-direction.md` | UI、交互和产品方向 |
| `.harness/contracts/sprint-XX-contract.md` | 当前 sprint 要实现什么 |
| `.harness/contracts/sprint-XX-review.md` | sprint contract 是否可以进入实现 |
| `.harness/runtime.md` | Evaluator 如何安装、启动和检查应用 |
| `.harness/qa/sprint-XX-qa-report.md` | 当前 sprint 的 QA 结果 |
| `.harness/qa/sprint-XX-fix-log.md` | QA 失败后的修复记录 |
| `.harness/qa/sprint-XX-retest.md` | 修复后的重测结果 |
| `.harness/final/qa-final-report.md` | 最终评估报告 |

## QA 如何工作

Auto-Harness 会把实现和评估分开：

- Generator 负责实现，并写自检结果。
- Evaluator 会先审 sprint contract，再允许进入编码。
- Evaluator 会对实现结果做 QA。
- 如果 QA 失败，Generator 修复报告中列出的问题。
- Evaluator 对这些修复做 retest。
- 最终报告也会经过 review 后才结束流程。

如果是浏览器应用，Evaluator 可以通过 Playwright MCP 操作真实 UI。

## 并行模式说明

并行模式适合较大的 sprint，前提是工作可以拆成相对独立的部分。

build 阶段：

- sprint contract 会包含依赖图
- 当前 ready 的节点会分配给 worker agent
- 每个 worker 在独立 git worktree 中运行
- worker 完成后提交自己的改动
- integrator 合并完成的 worker 分支
- 所有 build 节点合并后，写出 runtime 和 self-check

fix 阶段：

- QA 和 retest 报告使用普通格式
- Auto-Harness 读取 bug 表
- bug ID 会被临时拆成 worker batch
- worker 在 worktree 中修复自己负责的 batch
- integrator 合并完成的分支，并写出 fix log

当任务边界清楚时，并行模式可能更快。如果多个 worker 改到同一片代码，也可能出现 merge conflict。

## 恢复工作

在同一个项目里再次运行同一个命令即可继续：

```text
/auto-harness:harness
```

或：

```text
/auto-harness:harness-parallel
```

Auto-Harness 会读取 `.harness/status.md`，从下一个合法步骤继续。压缩上下文前，它也会刷新 `.harness/checkpoints/latest.md`。

## 常见问题

如果流程停在澄清或审批阶段，直接在 chat 里回答即可。

如果命令提示下一步属于另一个模式，就使用它提示的命令。例如 Generator 侧工作可以用 `/auto-harness:build` 推进，Evaluator 侧工作可以用 `/auto-harness:qa` 推进。

如果浏览器 QA 无法运行，请检查 Playwright MCP 是否可用。插件内置的 `.mcp.json` 会使用：

```text
npx -y @playwright/mcp@latest
```

如果并行模式因为 merge conflict 或改动重叠被阻塞，请继续留在当前 session 中，让 integrator 报告具体阻塞和对应 worktree。

## License

见 [LICENSE](LICENSE)。
