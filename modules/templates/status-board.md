---
module: status-board-template
kind: template
applies_to: [planner, orchestrator]
exports:
  - status_frontmatter_shape
  - status_body_shape
---

# Status Board Template

`status.md` frontmatter should preserve these stable fields whenever known:

```yaml
selected_pack: default
selected_rubric: default-grading
```

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

Body guidance:

- summarize the current brief and planning state
- point to `.harness/intake.md` as the durable clarification log
- show the sprint board once the spec exists
- point to `.harness/final/qa-final-report.md` when the harness is done
