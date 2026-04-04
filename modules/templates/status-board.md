---
module: status-board-template
kind: template
applies_to: [planner, orchestrator]
---

# Status Board Template

`status.md` frontmatter should preserve these stable fields whenever known:

```yaml
phase: <phase>
current_sprint: <number>
total_sprints: <number>
pending_action: <action>
last_agent: <planner|generator|evaluator|orchestrator>
selected_pack: default
selected_rubric: default-grading
updated_at: <ISO-8601 timestamp>
approval_required: <true|false>
```

## State Shapes

Clarification state shape:

```yaml
---
phase: AWAITING_BRIEF_CLARIFICATION
current_sprint: 0
total_sprints: 0
pending_action: brief_clarification
last_agent: planner
selected_pack: default
selected_rubric: default-grading
updated_at: <ISO-8601 timestamp>
approval_required: true
---
```

Spec approval state shape:

```yaml
---
phase: AWAITING_SPEC_APPROVAL
current_sprint: 0
total_sprints: <number of planned sprints>
pending_action: spec_approval
last_agent: planner
selected_pack: <pack name>
selected_rubric: <rubric name>
updated_at: <ISO-8601 timestamp>
approval_required: true
---
```

Contracting state shape:

```yaml
---
phase: CONTRACTING
current_sprint: <sprint number>
total_sprints: <number of planned sprints>
pending_action: generator_contract | evaluator_review
last_agent: generator | evaluator | orchestrator
selected_pack: <pack name>
selected_rubric: <rubric name>
updated_at: <ISO-8601 timestamp>
approval_required: false
---
```

Building state shape:

```yaml
---
phase: BUILDING
current_sprint: <sprint number>
total_sprints: <number of planned sprints>
pending_action: generator_build
last_agent: evaluator
selected_pack: <pack name>
selected_rubric: <rubric name>
updated_at: <ISO-8601 timestamp>
approval_required: false
---
```

QA state shape:

```yaml
---
phase: QA
current_sprint: <sprint number>
total_sprints: <number of planned sprints>
pending_action: evaluator_qa | evaluator_retest | evaluator_final
last_agent: generator | evaluator
selected_pack: <pack name>
selected_rubric: <rubric name>
updated_at: <ISO-8601 timestamp>
approval_required: false
---
```

Fixing state shape:

```yaml
---
phase: FIXING
current_sprint: <sprint number>
total_sprints: <number of planned sprints>
pending_action: generator_fix
last_agent: evaluator
selected_pack: <pack name>
selected_rubric: <rubric name>
updated_at: <ISO-8601 timestamp>
approval_required: false
---
```

Done state shape:

```yaml
---
phase: DONE
current_sprint: <total_sprints>
total_sprints: <number of planned sprints>
pending_action: none
last_agent: evaluator
selected_pack: <pack name>
selected_rubric: <rubric name>
updated_at: <ISO-8601 timestamp>
approval_required: false
---
```

## Body Guidance

Body sections should typically include:

- `# Planning Status`
- `## Current State`
- `## Sprint Board`
- `## Key Files`

Guidance:

- summarize the current brief and planning or execution state
- point to `.harness/intake.md` as the durable clarification log
- show the sprint board once the spec exists
- point to `.harness/final/qa-final-report.md` when the harness is done
