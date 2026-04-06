# Auto-Harness

[English](README.md) | [中文](README.zh-CN.md)

这个插件基于 Anthropic 的文章 [Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps)。

Auto-Harness 是一个面向 Claude Code 的长周期应用开发插件。它把一次产品 brief 转成一个持久化的 `Planner -> Generator -> Evaluator` 工作流，并把 contract review、QA、fix/retest 和恢复执行能力都落到 `.harness/` 中。

## 一眼看懂

- 把一次产品需求变成多阶段工作流，而不是一段无限拉长的聊天
- 把规划、实现、QA 和修复循环按角色拆开
- 用 `.harness/` 保存持久化状态，支持重启和 compaction 后继续推进
- 每个 sprint 先过 contract review，再进入实现
- QA、retest 和 final report 都会经过显式 reviewer agent 审核

## 它解决什么问题

- 长任务把规划、实现和 QA 混在同一个线程里时，很容易失控
- 多天、多 sprint 的工作需要持久状态，而不只是聊天上下文
- fix loop 如果不继承原始 contract 和上一轮 QA 结论，很容易越修越偏
- 操作者需要能落盘、能检查、能恢复的 spec、contract、review、QA report、fix log 和 checkpoint

## 适合什么场景

- 你希望 Claude Code 跨多个 sprint 交付一个功能
- 你希望 `Planner`、`Generator`、`Evaluator` 角色严格分离
- 你希望 QA 和 fix/retest 成为默认流程的一部分
- 你希望 `.harness/` 产物可读、可 diff、可恢复

## 不适合什么场景

- 一次性的小改动或很小的 bug 修复
- 不想承担 contract / review / report 这些流程成本的探索性尝试
- 不接受在项目旁边生成 `.harness/` 状态目录的仓库

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

3. 安装插件：

```text
/plugin install auto-harness@auto-harness-marketplace
```

4. 重启 Claude Code。
5. 运行：

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
