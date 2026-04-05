# Auto-Harness

[English](README.md) | [中文](README.zh-CN.md)

这个插件基于 Anthropic 的文章 [Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps) 开发。

Auto-Harness 是一个面向 Claude Code 的长周期开发插件。它把规划、实现、QA、修复循环和恢复继续执行都沉淀到 `.harness/` 目录里，同时保持主线程只负责编排，不直接代写产品代码或 QA 结论。

- `commands/` 继续作为控制面
- `agents/` 是动作级 subagent，每个 agent 只负责一个合法的 Auto-Harness action
- `skills/` 承载动作级行为，例如 `planner-clarify` 和 `evaluator-write-qa`
- `hooks/` 与 skill 自带 hooks 负责边界约束、报告校验和恢复上下文
- `scripts/` 提供状态、运行时、报告校验和 checkpoint 辅助能力

## 你会得到什么

- 严格的 Planner / Generator / Evaluator 动作级工作流
- 持久化的 `.harness/` 项目状态目录
- 先 contract review 再实现的 sprint 循环
- Evaluator 侧可用 Playwright MCP 做浏览器 QA
- 通过 hooks 和 checkpoint 实现的恢复能力
- 通过 internal skills 实现的动作级约束，而不是大而泛的共享提示词

## 运行模型

### Main Thread: Orchestrator

主线程只负责：

- 读取 `.harness/` 状态
- 判断下一步合法阶段
- 派发新的 subagent
- 更新 `.harness/status.md`
- 在需要澄清或审批时直接与用户对话

主线程不写 spec，不写业务代码，也不下 QA 结论。

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

每个动作级 agent 都只预加载一个 internal skill，并自行读取当前项目里的 `.harness/` 状态。动作级 skill 是主要行为层；模板、rubric、pack、hooks 和本地 protocol references 为它提供支撑。

## 端到端流程

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
  -> evaluator-write-qa-agent
  -> if FAIL: generator-apply-fixes-agent -> evaluator-write-retest-agent
  -> next sprint or final report
```

用户交互始终发生在 chat 里；`.harness/*.md` 是持久化日志，而不是强迫用户手动打开才能继续的文档。

## 快速开始

### 前置条件

- 已安装并登录 Claude Code
- `PATH` 中可用 `Node.js`
- 目标项目目录允许创建 `.harness/`
- 如果要做浏览器 QA，需要具备 Playwright MCP 支持

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

### 最小操作心智

- 正常端到端流程用 `/auto-harness:harness`
- 只做 intake 和 spec 用 `/auto-harness:plan`
- 只推进 Generator 侧用 `/auto-harness:build`
- 只推进 Evaluator 侧用 `/auto-harness:qa`

## Commands

### `/auto-harness:harness <brief-or-reply>`

默认命令，可处理：

- 初始产品 brief
- clarification answers
- spec approval
- 当前 sprint 状态的后续恢复

### `/auto-harness:plan <brief-or-clarification-answers>`

规划模式，可：

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
| `.harness/intake.md` | Planner | 已澄清需求、锁定决策、约束与 selected pack |
| `.harness/spec.md` | Planner | 已批准的实现计划与 sprint 拆分 |
| `.harness/design-direction.md` | Planner | Generator 应遵循的 UI / 交互 / 产品方向 |
| `.harness/status.md` | Planner + Orchestrator | 机器可读的状态真源：由 Planner 初始化，由 Orchestrator 推进 |
| `.harness/runtime.md` | Generator | 启动和校验应用的运行时契约 |
| `.harness/contracts/sprint-XX-contract.md` | Generator | 当前 sprint 的实现 contract |
| `.harness/contracts/sprint-XX-review.md` | Evaluator | contract review 结果 |
| `.harness/qa/sprint-XX-self-check.md` | Generator | QA 前的自检 |
| `.harness/qa/sprint-XX-qa-report.md` | Evaluator | sprint QA 结果 |
| `.harness/qa/sprint-XX-fix-log.md` | Generator | QA 失败后的修复记录 |
| `.harness/qa/sprint-XX-retest.md` | Evaluator | 修复后的 retest 结果 |
| `.harness/final/qa-final-report.md` | Evaluator | 最终评估报告 |
| `.harness/checkpoints/latest.md` | Hook/script | session restart 或 compaction 时使用的 checkpoint |

## Status Model

`.harness/status.md` 的 frontmatter 是状态真源。常见字段如下：

```yaml
phase: CONTRACTING
current_sprint: 1
total_sprints: 3
pending_action: evaluator_review
last_agent: generator
approval_required: false
selected_pack: default
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
|   `-- evaluator-write-final-agent.md
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

每个 subagent 的每个动作都是一个 internal skill，并且 skill 自带 supporting files 与 hooks。

例如：

- `planner-clarify`：只管 clarification intake
- `generator-build-sprint`：只管已批准 sprint 的实现
- `evaluator-write-qa`：只管 QA 执行和 QA report 约束

这些 skills 的特点：

- 不作为用户主入口
- 不在 `/` 菜单里作为正常工作流展示
- 由对应 action-specific subagent 预加载
- 自身携带动作级模板、rubric、pack 内容和 hook 守门逻辑

## Hooks 与恢复能力

插件现在有两层 hooks：

- `hooks/hooks.json` 中的插件级 hooks
- skill frontmatter 中的 skill-scoped hooks

插件级 hooks：

- `SessionStart`：读取 `.harness/status.md`，注入 checkpoint 摘要，提醒当前 session 应该继续而不是重新规划
- `PreCompact`：在 compaction 前刷新 `.harness/checkpoints/latest.md`

skill-scoped hooks 用来执行动作级约束，例如：

- planner skills 只能写 planner-owned `.harness/` 文件
- generator skills 不能改 `status.md`、review 文件、QA report、retest report、final report
- evaluator report skills 会在 subagent 结束前强制校验报告结构与一致性

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

### State Helper

```text
node "${CLAUDE_PLUGIN_ROOT}/scripts/harness-state.mjs" get
node "${CLAUDE_PLUGIN_ROOT}/scripts/harness-state.mjs" summary
node "${CLAUDE_PLUGIN_ROOT}/scripts/harness-state.mjs" set key=value ...
node "${CLAUDE_PLUGIN_ROOT}/scripts/harness-state.mjs" checkpoint auto
```

### Runtime Helper

```text
node "${CLAUDE_PLUGIN_ROOT}/scripts/harness-runtime.mjs" get
node "${CLAUDE_PLUGIN_ROOT}/scripts/harness-runtime.mjs" healthcheck
```

### Report Helper

```text
node "${CLAUDE_PLUGIN_ROOT}/scripts/harness-report.mjs" qa validate
node "${CLAUDE_PLUGIN_ROOT}/scripts/harness-report.mjs" qa result
node "${CLAUDE_PLUGIN_ROOT}/scripts/harness-report.mjs" retest validate
node "${CLAUDE_PLUGIN_ROOT}/scripts/harness-report.mjs" final validate
```
