---
module: qa-report-template
kind: template
applies_to: [evaluator]
exports:
  - qa_report_template
---

# QA Report Template

```md
# Sprint XX QA Report

Result: PASS | FAIL

## Contract Behaviors
| # | Behavior | Result | Evidence |
| --- | --- | --- | --- |

## Bugs
| Bug ID | Severity | Summary | Reproduction | Notes |
| --- | --- | --- | --- | --- |

## Hard-Fail Gates
| Gate | Status | Evidence |
| --- | --- | --- |

## Scorecard
| Dimension | Score | Threshold | Pass? | Notes |
| --- | --- | --- | --- | --- |

## Verdict
- ...
- Any `FAIL` in Hard-Fail Gates forces overall `Result: FAIL`.
```
