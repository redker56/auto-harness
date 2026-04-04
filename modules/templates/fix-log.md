---
module: fix-log-template
kind: template
applies_to: [generator]
exports:
  - fix_log_template
---

# Fix Log Template

```md
# Sprint XX Fix Log

## Source QA Report
- report: `.harness/qa/sprint-XX-qa-report.md`

## Fixes Applied
| Bug ID | Change | Files | Notes |
| --- | --- | --- | --- |

## Deferred Or Unresolved Items
- ...

## Verification Notes
- ...
```

Guidance:

- Every named fix should map back to a bug ID from QA.
- If a bug is not fixed, say so explicitly instead of silently omitting it.
