---
module: runtime-template
kind: template
applies_to: [generator]
exports:
  - runtime_template
---

# Runtime Template

```md
---
working_directory: .
install_command: <command or none>
build_command: <command or none>
start_command: <command>
app_url: <url>
healthcheck_command: <command or none>
healthcheck_url: <url or none>
---

# Runtime Notes

## Prerequisites
- ...

## Startup Steps
1. ...

## Verification Notes
- ...
```

Guidance:

- Include enough detail for Evaluator to run the app without follow-up questions.
- If multiple services are required, document startup order clearly.
