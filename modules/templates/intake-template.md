---
module: intake-template
kind: template
applies_to: [planner]
---

# Intake Template

```md
# Product Intake

## Original Brief
- ...

## Selected Pack
- selected_pack: default

## Selected Rubric
- selected_rubric: default-grading

## Current Project Analysis
- ...

## Clarification Questionnaire

### Product and Users
1. ...

### Platform and UX
1. ...

### Stack and Infrastructure
1. ...

### Constraints and Non-Goals
1. ...

## User Clarifications
<!-- To be filled in during the clarification round -->

## Locked Decisions
<!-- To be locked after clarification -->

## Open Questions
- ...
```

Guidance:

- Questions should be grouped, numbered, and easy for Orchestrator to relay in chat.
- Keep `Selected Pack` and `Selected Rubric` near the top so downstream agents can find them quickly.
