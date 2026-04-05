---
module: runtime-template
kind: template
---

# Runtime Template

```md
---
working_directory: .
install_command: <command or none>
build_command: <command or none>
start_command: <command>
access_url: <url>
healthcheck_method: http-get
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

