---
module: retest-report-template
kind: template
applies_to: [evaluator]
exports:
  - retest_report_template
---

# Retest Report Template

```md
# Sprint XX Retest Report

Result: PASS | FAIL

## Retested Items
| Bug ID | Previous Issue | Retest Result | Evidence |
| --- | --- | --- | --- |

## Remaining Bugs
| Bug ID | Severity | Summary | Notes |
| --- | --- | --- | --- |

## Hard-Fail Gates
| Gate | Status | Evidence |
| --- | --- | --- |

## Verdict
- ...
```

Guidance:

- Retest only the named fixes and any tightly related regression surface.
- Do not silently upgrade unresolved issues to passed status.
