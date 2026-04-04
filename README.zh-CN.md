# Auto-Harness

本插件基于 Anthropic 的文章 [Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps) 开发，并将其中的思路落地为一个 Claude Code 插件：通过 commands、hooks、可持久化 artifacts，以及职责清晰的 subagents 来组织长时任务。

它的目标很简单：让规划、实现、QA、修复、恢复与续跑能够跨越长会话、上下文压缩和上下文重置稳定进行，而不是把主线程变成一个越来越臃肿的提示词堆。

从整体上看，这个插件围绕 3 个核心原则构建：

- 主线程只做编排，不直接写产品代码，也不直接给 QA 结论
- 每个 sprint 都先通过文件化 contract 对齐，再开始实现
- `Evaluator` 必须基于正在运行的应用验证主路径，sprint 才能通过

## 你能得到什么

- 一套严格的三角色工作流：`Planner`、`Generator`、`Evaluator`
- 一个持久化的项目状态目录：`.harness/`
- 一套先 contract、后实现、再 review/QA 的 sprint 循环
- `Evaluator` 侧可用的 Playwright MCP 浏览器 QA 能力
- 通过 hooks 和 checkpoint 快照支持长会话恢复
- 共享 guidance modules，让 agent kernel 保持精简且职责单一

## 运行模型

### 主线程：Orchestrator

主线程只做这些事：

- 读取 `.harness/` 中的项目状态
- 决定当前应该进入哪个阶段
- 分派 fresh subagent
- 更新 `.harness/status.md`
- 在需要澄清或审批时直接与用户对话

主线程不会起草 spec、不会写应用代码，也不会做 QA 判断。

### Planner

`Planner` 是一个 fresh subagent，负责：

- 澄清需求 intake
- 锁定架构和技术栈决策
- sprint 规划
- 起草 design direction

`Planner` 只在 `.harness/` 内写文件。

### Generator

`Generator` 是一个 fresh subagent，负责：

- 起草 sprint contract
- 具体实现
- QA 失败后的缺陷修复

`Generator` 会写代码和属于 `Generator` 的 `.harness/` artifacts，但不会更新状态、不会写 review 文件、不会写 QA report、不会写 retest report，也不会写 final report。

### Evaluator

`Evaluator` 是一个 fresh subagent，负责：

- contract review
- runtime QA
- 修复后的 retest
- 最终报告

`Evaluator` 对应用代码保持只读。它依据正在运行的应用和被点名的 artifacts 来做判断，而不是相信 `Generator` 的自我描述。

## 端到端流程

```text
用户 brief
  -> Orchestrator
  -> Planner 澄清问卷
  -> 用户在 chat 中直接回答
  -> Planner 输出 spec + design direction
  -> 用户批准或提出修改
  -> Generator 起草 contract
  -> Evaluator 做 contract review
  -> Generator build
  -> Evaluator QA
  -> 如果 FAIL: Generator fix -> Evaluator retest
  -> 进入下一 sprint 或 final report
```

用户交互发生在 chat 中。`.harness/*.md` 是持久化日志，而不是要求用户必须手动打开才能继续的文档。

## 快速开始

### 前置条件

- 已安装并完成认证的 Claude Code
- `PATH` 中可用的 Node.js
- 一个允许 Auto-Harness 创建 `.harness/` 的目标项目目录
- 如果你想做浏览器 QA，需要 Playwright MCP 支持

如果你在 Claude Code 中看不到插件相关命令，请先升级 Claude Code。

### 从 GitHub 安装

1. 在你希望使用 Auto-Harness 的项目中打开 Claude Code。
2. 将 GitHub 仓库添加为插件 marketplace：

```text
/plugin marketplace add redker56/auto-harness
```

1. 从该 marketplace 安装插件：

```text
/plugin install auto-harness@auto-harness-marketplace
```

1. 重启 Claude Code，让新安装的插件被加载。
2. 运行主命令：

```text
/auto-harness:harness <你的产品 brief 或澄清回复>
```

1. 在 chat 中直接回答澄清问题。
2. 在 chat 中直接批准生成的 spec，或者回复修改意见。
3. 让 sprint loop 持续推进，直到 final report 生成。

### 最小操作心智模型

- 正常端到端流程用 `/auto-harness:harness`
- 只做 intake 和 spec 阶段用 `/auto-harness:plan`
- 只推进 Generator 侧工作用 `/auto-harness:build`
- 只推进 Evaluator 侧工作用 `/auto-harness:qa`

## Commands

### `/auto-harness:harness <brief-or-reply>`

这是默认命令。它可以处理：

- 初始产品 brief
- clarification answers
- spec approval
- 后续对当前 sprint 状态的恢复与续跑

当你希望 orchestrator 自动选择下一个合法步骤，并在同一次调用里持续推进多个合法步骤，直到遇到用户阻塞状态、结构无效的 QA report，或者 `DONE` 时，就使用它。subagent 或 artifact 失败应该被视为 orchestrator 在同一 loop 内自行恢复的问题，而不是停下来的理由。

### `/auto-harness:plan <brief-or-clarification-answers>`

纯规划模式。它可以：

- 初始化 `.harness/intake.md`
- 提出澄清问题
- 起草 `.harness/spec.md`
- 起草 `.harness/design-direction.md`

它会在 spec approval 处停止，不会进入 sprint loop。

### `/auto-harness:build [XX]`

Generator 侧模式。它会从 `.harness/status.md` 自动选择当前合法的 Generator 动作：

- contract drafting
- build
- fix

当你只想继续实现工作，而不跑完整 harness loop 时，使用它。

### `/auto-harness:qa [XX]`

Evaluator 侧模式。它会从 `.harness/status.md` 自动选择当前合法的 Evaluator 动作：

- contract review
- QA
- retest
- final reporting

当你想在手动修改后重新验证，或者只恢复 QA 侧工作时，使用它。

## `.harness/` Artifact Contract

Auto-Harness 会为每个项目创建一个状态目录：

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
| `.harness/intake.md` | Planner | 澄清后的需求、锁定决策、约束、selected pack、selected rubric |
| `.harness/spec.md` | Planner | 已批准的实现计划与 sprint 拆分 |
| `.harness/design-direction.md` | Planner | `Generator` 需要遵循的 UI / 交互 / 产品方向 |
| `.harness/status.md` | Orchestrator | 机器可读的状态唯一真源 |
| `.harness/runtime.md` | Generator | 用于启动和验证应用的 runtime contract |
| `.harness/contracts/sprint-XX-contract.md` | Generator | 提议中的 sprint 实现 contract |
| `.harness/contracts/sprint-XX-review.md` | Evaluator | contract review 结果，包括必须修改项 |
| `.harness/qa/sprint-XX-self-check.md` | Generator | 交给 QA 前的自检 |
| `.harness/qa/sprint-XX-qa-report.md` | Evaluator | sprint QA 结果 |
| `.harness/qa/sprint-XX-fix-log.md` | Generator | QA 失败后的修复记录 |
| `.harness/qa/sprint-XX-retest.md` | Evaluator | 修复后的 retest 结果 |
| `.harness/final/qa-final-report.md` | Evaluator | 整个流程结束后的最终评估 |
| `.harness/checkpoints/latest.md` | Hook/script | 用于会话重启或 compaction 恢复的快照 |

## 状态模型

`.harness/status.md` 的 frontmatter 是状态唯一真源。helper scripts 和 hooks 期望它包含类似下面的字段：

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

### 常见 `phase`

- `AWAITING_BRIEF_CLARIFICATION`
- `AWAITING_SPEC_APPROVAL`
- `CONTRACTING`
- `BUILDING`
- `QA`
- `FIXING`
- `DONE`

### 常见 `pending_action`

- `brief_clarification`
- `spec_approval`
- `generator_contract`
- `evaluator_review`
- `generator_build`
- `evaluator_qa`
- `generator_fix`
- `evaluator_retest`
- `evaluator_final`

命令层通过 `phase`、`current_sprint`、`total_sprints` 和 `pending_action` 判断当前合法的下一步，防止用户或 subagent 跳过尚未完成的阶段。

## 仓库结构

```text
auto-harness/
|-- .claude-plugin/
|   |-- marketplace.json
|   `-- plugin.json
|-- LICENSE
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

## 模块库

`modules/` 是共享 operating library。agent kernels 会保持尽量小，把真正的操作规则从这些可复用模块中拉进来。

- `modules/protocols/`：角色边界、contracts、文件归属规则
- `modules/templates/`：intake、spec、contract、report、runtime 的输出模板
- `modules/rubrics/`：`Evaluator` 使用的评分标准
- `modules/clarification/`：`Planner` 的澄清问题体系和澄清策略
- `modules/catalogs/`：架构和技术栈选项目录
- `modules/packs/`：可复用的偏好包，例如 `default`、`internal-tool`、`mobile-first` 和特定技术栈 pack

`Planner` 会收到 protocols、clarification guidance、catalogs、templates 和 packs。`Generator` 会收到 protocols、implementation templates 和 packs。`Evaluator` 会收到 protocols、rubrics、evaluation templates 和 packs。

模块文件会从当前支持的 `modules/` 子目录中自动发现，并按 `applies_to` frontmatter 做过滤。如果你在这些已支持目录下新增一个带正确 `applies_to` 的模块文件，它会自动生效，不需要维护逐文件列表。如果你新增了全新的 bundle 类别或模块目录，还需要同步更新 `scripts/harness-lib.mjs` 中的注入配置。

## Hooks 与恢复机制

`hooks/hooks.json` 接入了 3 个生命周期事件：

- `SessionStart`：读取 `.harness/status.md`，注入 checkpoint 摘要，并提醒会话恢复而不是重新开始规划
- `SubagentStart`：注入从 `modules/` 组装出来的角色专属 operating guidance
- `PreCompact`：在 compaction 前刷新 `.harness/checkpoints/latest.md`

这也是 Auto-Harness 能够在长会话和上下文压缩下保持韧性的关键。

## Playwright MCP

插件自带一个 `.mcp.json`，通过以下命令启动 Playwright：

```text
npx -y @playwright/mcp@latest
```

实际效果上：

- `Planner` 和 `Generator` 会被隔离在 MCP 驱动的浏览器工作之外
- `Evaluator` 继承 MCP 能力，可以用它做浏览器 QA
- `Evaluator` 也可以调用 runtime helper，在 QA 前或 QA 中执行健康检查

## Helper Scripts

### State Helper

读取当前状态文档：

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/harness-state.mjs" get
```

打印简短摘要：

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/harness-state.mjs" summary
```

更新指定的 frontmatter 字段：

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/harness-state.mjs" set phase=QA pending_action=evaluator_qa
```

刷新 checkpoint 快照：

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/harness-state.mjs" checkpoint auto
```

所有状态命令默认将当前工作目录视为项目根目录。你也可以在 key-value 参数前显式传入项目根目录。

### Runtime Helper

读取 `.harness/runtime.md`：

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/harness-runtime.mjs" get
```

执行 HTTP health check：

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/harness-runtime.mjs" healthcheck
```

当前 health check 期望：

- `healthcheck_method: http-get`
- `healthcheck_url`，或者退化使用 `access_url`

### QA Report Helper

校验当前 sprint QA report 的结构：

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/harness-report.mjs" qa validate
```

读取已验证的 PASS/FAIL 结果：

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/harness-report.mjs" qa result
```

这个 helper 会检查 QA report 是否包含以下必需 sections 和表格：

- `Result`
- `Primary Path Exercise`
- `Contract Behaviors`
- `Bugs`
- `Hard-Fail Gates`
- `Scorecard`
- `Verdict`

## 设计规则

- 主线程始终保持 orchestration-only
- 每次 delegation 都使用 fresh subagent
- 重要决策写进文件，而不是只留在 chat history 里
- `Generator` 在 contract 批准前不能开始实现
- `Evaluator` 根据文件和 runtime 行为做判断，而不是根据乐观解释做判断
- 恢复时应该从 `.harness/status.md` 继续，而不是重新跑完整 planning loop

## 适用场景

Auto-Harness 最适合这些情况：

- 任务会跨多轮甚至多个 sprint
- 项目需要持久化的 planning artifacts
- 你希望实现与 QA 判断之间有明确分离
- 你预期会话会重启、compaction 或中断
- 浏览器验证很重要

对于很小的一次性修改，如果单次直接 coding pass 就足够，它通常会显得过重。
