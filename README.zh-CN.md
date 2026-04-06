# Auto-Harness

[English](README.md) | [中文](README.zh-CN.md)

这个插件基于 Anthropic 的文章 [Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps)。

Auto-Harness 让你在 Claude Code 里就像“带着一支小型专业团队”在推进项目，而不是困在一场没完没了的对话里。你只需要给一个需求概要，它就会把规划、开发、测试、修复重测和最终汇总纳入一个持久的 `规划器 -> 生成器 -> 评估器` 工作流，所有关键产出都会保存在 `.harness/` 目录中。

## 核心特点

- 把产品需求变成“像有团队在交付”的多阶段工作流，而不是一场没完没了的对话
- 将规划、开发、测试和修复循环拆分成更像专业分工的角色
- 用 `.harness/` 保存持久化状态，即使重启或压缩对话，多天任务也能继续推进
- 每个迭代周期先进行契约评审，再进入开发，避免跑偏
- 测试、重测和最终报告都会经过专门的评审代理审核，防止流程糊弄过关

## 解决的问题

- 长任务把规划、开发和测试混在同一个对话线程里，很容易失控
- 跨多天、多迭代周期的项目推进需要持久状态，不能只靠聊天上下文和临场发挥
- 修复循环如果不继承原始契约和上一轮测试结论，很容易越修越偏
- 真正要交付的项目，需要能落盘、能检查、能恢复的规格说明、契约、评审记录、测试报告、修复日志和检查点

## 适用场景

- 希望 Claude Code 跨多个迭代周期交付一个功能
- 希望 `规划器`、`生成器`、`评估器` 这三个角色严格分离
- 希望测试和修复重测成为默认流程的一部分
- 希望 `.harness/` 中的产物可读、可对比差异、可恢复

## 不适用场景

- 一次性小改动或很小的 Bug 修复
- 不想承担契约/评审/报告等流程成本的探索性尝试

## 30 秒理解工作流

```text
User brief
  -> Orchestrator
  -> planner-clarify-agent
  -> planner-spec-draft-agent
  -> generator-draft-contract-agent
  -> evaluator-review-contract-agent
  -> generator-build-sprint-agent
  -> evaluator-write-qa-agent -> qa-report-reviewer-agent
  -> if FAIL: generator-apply-fixes-agent -> evaluator-write-retest-agent -> retest-report-reviewer-agent
  -> evaluator-write-final-agent -> final-report-reviewer-agent
```

用户交互始终发生在 chat 中，`.harness/*.md` 是持久化日志。

## 快速开始

### 前置条件

- 已安装并登录 Claude Code
- `PATH` 中可用 `Node.js`
- 目标项目目录允许 Auto-Harness 创建 `.harness/`
- 如果需要浏览器 QA，具备 Playwright MCP 支持

### 从 GitHub 安装

1. 在目标项目中打开 Claude Code。
2. 添加插件 marketplace：

```text
/plugin marketplace add redker56/auto-harness
```

1. 安装插件：

```text
/plugin install auto-harness@auto-harness-marketplace
```

1. 重启 Claude Code。
2. 运行：

```text
/auto-harness:harness <你的产品 brief 或澄清回复>
```

### 操作员心智模型

- 用 `/auto-harness:harness` 跑完整端到端流程
- 用 `/auto-harness:plan` 处理 intake 和 spec
- 用 `/auto-harness:build` 推进 Generator 侧工作
- 用 `/auto-harness:qa` 推进 Evaluator 侧工作

## 运行模型

### Main Thread: Orchestrator

主线程负责：

- 读取 `.harness/` 状态
- 判断下一步合法阶段
- 派发新的 subagent
- 直接编辑 `.harness/status.md`，并在需要时刷新 `.harness/checkpoints/latest.md`
- 在需要时也可以编辑普通项目文件，但会把有归属的 `.harness/` 产物留给对应 subagent
- 在需要澄清或审批时直接与用户对话

主线程不写 spec，也不做 QA 判断。

### Action-Specific Subagents

Auto-Harness 会按合法动作派发这些 focused subagent：

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

writer agents 各自预加载一个 internal skill，并自行读取当前项目中的 `.harness/` 状态。reviewer agents 通过 prompt 审查 QA、retest 和 final 报告，并按照内嵌的 rubric 与 template 做判断。internal skills 负责行为指导，运行时执法位于插件根。

## Commands

### `/auto-harness:harness <brief-or-reply>`

默认命令，可处理：

- 初始产品 brief
- clarification answers
- spec approval
- 当前 sprint 状态的后续恢复

### `/auto-harness:plan <brief-or-clarification-answers>`

规划模式，可用于：

- 初始化 `.harness/intake.md`
- 提出澄清问题
- 生成 `.harness/spec.md`
- 生成 `.harness/design-direction.md`

### `/auto-harness:build [XX]`

Generator 侧命令，会从 `.harness/status.md` 自动选择当前合法动作：

- contract drafting
- build
- fix

### `/auto-harness:qa [XX]`

Evaluator 侧命令，会从 `.harness/status.md` 自动选择当前合法动作：

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

### 文件归属

| Artifact | Owner | Purpose |
| --- | --- | --- |
| `.harness/intake.md` | Planner | 已澄清需求、锁定决策与约束 |
| `.harness/spec.md` | Planner | 已批准的实现计划与 sprint 拆分 |
| `.harness/design-direction.md` | Planner | Generator 需要遵循的 UI、交互或产品方向 |
| `.harness/status.md` | Planner + Orchestrator | 机器可读的状态真源，由 Planner 初始化，由 Orchestrator 推进 |
| `.harness/runtime.md` | Generator | 启动和校验应用的运行时契约 |
| `.harness/contracts/sprint-XX-contract.md` | Generator | 当前 sprint 的实现 contract |
| `.harness/contracts/sprint-XX-review.md` | Evaluator | contract review 结果 |
| `.harness/qa/sprint-XX-self-check.md` | Generator | QA 前的自检 |
| `.harness/qa/sprint-XX-qa-report.md` | Evaluator | sprint QA 结果 |
| `.harness/qa/sprint-XX-fix-log.md` | Generator | QA 失败后的修复记录 |
| `.harness/qa/sprint-XX-retest.md` | Evaluator | 修复后的 retest 结果 |
| `.harness/final/qa-final-report.md` | Evaluator | 最终评估报告 |
| `.harness/checkpoints/latest.md` | Orchestrator + Hook | session restart 或 compaction 时使用的 checkpoint |

## Status Model

`.harness/status.md` 的 frontmatter 是状态真源。常见字段如下：

```yaml
phase: CONTRACTING
current_sprint: 1
total_sprints: 3
pending_action: evaluator_review
last_agent: generator
approval_required: false
```

典型 phase：

- `AWAITING_BRIEF_CLARIFICATION`
- `AWAITING_SPEC_APPROVAL`
- `CONTRACTING`
- `BUILDING`
- `QA`
- `FIXING`
- `DONE`

典型 pending_action：

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

## 仓库结构

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
|   `-- root-guard.mjs
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

每个 writer subagent 的动作都对应一个 internal skill，并带有自己的 supporting files。

例如：

- `planner-clarify`：clarification intake
- `generator-build-sprint`：已批准 sprint 的实现
- `evaluator-write-qa`：QA 执行和 QA report 撰写指导

这些 skills 的特点：

- 不作为用户主入口
- 不在 `/` 菜单中作为正常工作流展示
- 由对应的 action-specific subagent 预加载
- 负责动作级规则、模板和写作指导

## Hooks 与恢复能力

插件使用插件根 hooks：

- `SessionStart`：读取 `.harness/status.md`，注入 checkpoint 摘要，并按记录状态恢复当前 harness session
- `PreCompact`：在 compaction 前刷新 `.harness/checkpoints/latest.md`
- `PreToolUse`：在插件根统一保护 `.harness/` 归属边界，并把 `.harness/status.md` 作为合法动作真源
- `SubagentStart` / `SubagentStop`：跟踪当前活跃的 Auto-Harness subagent，便于观察和根级执法

完成度检查包括：

- Planner、Generator 和 contract-review 的产物由 `node "${CLAUDE_PLUGIN_ROOT}/scripts/action-check.mjs"` 显式校验
- QA、retest 和 final 报告由显式 reviewer agents 审查
- 这些检查通过后，Orchestrator 才会推进状态

## Playwright MCP

插件内置 `.mcp.json`，通过下面的命令启动 Playwright：

```text
npx -y @playwright/mcp@latest
```

实际分工：

- Planner 和 Generator 不做 MCP 浏览器操作
- Evaluator 继承 MCP 能力用于浏览器 QA
- Evaluator 也可以调用 runtime helper 做健康检查

## Helper Scripts

### 状态文件

- 主线程在推进状态时直接编辑 `.harness/status.md`
- 主线程在需要刷新操作者可读 checkpoint 时直接编辑 `.harness/checkpoints/latest.md`
- 其他 `.harness/` 产物继续由各自的 Planner、Generator 或 Evaluator subagent 维护

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
