# Auto-Harness

[English](README.md) | [中文](README.zh-CN.md)

Auto-Harness 是一个 Claude Code 插件，适合处理需要规划、实现、QA、修复、重测和最终报告的较长软件任务。

你给它一个产品 brief，它会把任务变成可恢复的项目工作流：先澄清需求，再起草 spec 让你确认，然后按 sprint 实现、评估结果，并把过程记录到项目文件里。

这个插件参考了 Anthropic 的文章：[Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps)。

## 我该用哪个命令？

不确定时，使用普通串行工作流：

```text
/auto-harness:harness <你的产品 brief>
```

只有当项目是 Git 仓库，并且当前 sprint 可以拆成相对独立的工作流时，才使用并行工作流：

```text
/auto-harness:harness-parallel <你的产品 brief>
```

串行状态保存在 `.harness/`。并行状态保存在 `.harness-parallel/`。两套工作流不共用 status 文件，所以可以在同一个项目里并存。

## 工作流

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

Generator 负责实现。Evaluator 负责审查 contract、执行 QA、重测修复并写最终评估。

## 安装

在你想让 Auto-Harness 工作的项目里打开 Claude Code。

```text
/plugin marketplace add redker56/auto-harness
/plugin install auto-harness@auto-harness-marketplace
```

安装后重启 Claude Code。

## 命令

| 命令 | 用途 |
| --- | --- |
| `/auto-harness:plan <brief-or-reply>` | 只推进串行 planning：intake、澄清、spec 和设计方向 |
| `/auto-harness:plan-parallel <brief-or-reply>` | 只推进 `.harness-parallel/` 里的并行 planning |
| `/auto-harness:harness <brief-or-reply>` | 运行或恢复串行端到端工作流 |
| `/auto-harness:harness-parallel <brief-or-reply>` | 运行或恢复并行端到端工作流 |
| `/auto-harness:build [sprint]` | 推进串行 Generator 工作 |
| `/auto-harness:build-parallel [sprint]` | 推进并行 Generator 工作 |
| `/auto-harness:qa [sprint]` | 推进串行 Evaluator 工作：review、QA、retest 或 final report |
| `/auto-harness:qa-parallel [sprint]` | 推进并行 Evaluator 工作 |

大多数情况下，用 `/auto-harness:harness` 就够了。明确想使用 git worktree 并行实现时，用 `/auto-harness:harness-parallel`。

## 会生成哪些文件？

串行工作流文件：

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

并行工作流使用同样结构，但目录是 `.harness-parallel/`。

常用文件：

| 文件 | 内容 |
| --- | --- |
| `intake.md` | 已澄清的需求和约束 |
| `spec.md` | 已确认的产品计划和 sprint 拆分 |
| `design-direction.md` | UI、交互和产品方向 |
| `contracts/sprint-XX-contract.md` | 当前 sprint 要实现什么 |
| `contracts/sprint-XX-review.md` | sprint contract 是否可以进入实现 |
| `runtime.md` | Evaluator 如何安装、启动和检查应用 |
| `qa/sprint-XX-qa-report.md` | 当前 sprint 的 QA 结果 |
| `qa/sprint-XX-fix-log.md` | QA 失败后的修复记录 |
| `qa/sprint-XX-retest.md` | 修复后的重测结果 |
| `final/qa-final-report.md` | 最终评估报告 |

## 并行模式

并行模式会用 git worktree 执行 Generator 的 build 和 fix 工作。

build 阶段：

- sprint contract 包含机器可读的依赖图
- ready 节点会分配给 worker agent
- 每个 worker 在独立 git worktree 中运行
- 每个 worker 提交自己的改动
- integrator 把完成的 worker 分支合并回主 worktree
- 所有 build 节点合并后，再写 runtime 和 self-check

fix 阶段：

- Auto-Harness 从普通 QA 或 retest 报告里读取 bug ID
- bug 会被临时拆成 fix batch
- worker 在独立 worktree 中修复自己的 batch
- integrator 合并完成的分支并写 fix log

当工作流彼此独立时，并行模式可能更快。如果当前 sprint 高度耦合，使用串行工作流更稳。

## 恢复工作

在同一个项目里再次运行同一个工作流命令即可：

```text
/auto-harness:harness
```

或：

```text
/auto-harness:harness-parallel
```

串行命令从 `.harness/status.md` 恢复。并行命令从 `.harness-parallel/status.md` 恢复。

## 运行要求

- 已安装并登录 Claude Code
- `PATH` 中可以使用 Node.js
- 项目目录允许 Auto-Harness 写入状态目录
- 并行模式需要 Git 仓库
- 需要浏览器 QA 时，建议启用 Playwright MCP

插件包含 `.mcp.json`，会启动：

```text
npx -y @playwright/mcp@latest
```

## License

见 [LICENSE](LICENSE)。
