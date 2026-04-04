---
module: qa-report-template
kind: template
applies_to: [evaluator]
---

# QA Report Template

```md
# Sprint XX QA Report

Result: PASS | FAIL

## Primary Path Exercise
- Flow: ...
- Result: PASS | FAIL
- Evidence: ...

## Contract Behaviors
| # | Behavior | Result | Evidence |
| --- | --- | --- | --- |

## Bugs
| Bug ID | Severity | Summary | Reproduction | Notes |
| --- | --- | --- | --- | --- |

## Hard-Fail Gates
| Gate | Status | Evidence |
| --- | --- | --- |
| Locked architecture respected | PASS | ... |

## Scorecard
| Dimension | Score | Threshold | Pass? | Notes |
| --- | --- | --- | --- | --- |
| Product depth | ... | ... | PASS | ... |
| Functional correctness | ... | ... | PASS | ... |
| Visual design | ... | ... | PASS | ... |
| Code quality | ... | ... | PASS | ... |

## Verdict
- ...
- Any `FAIL` in Hard-Fail Gates forces overall `Result: FAIL`.
```
