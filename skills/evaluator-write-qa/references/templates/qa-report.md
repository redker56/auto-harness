---
module: qa-report-template
kind: template
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

## Deduction Ledger
| Dimension | Rule | Deduction | Evidence | Notes |
| --- | --- | --- | --- | --- |
| Functional correctness | P1 | -2 | ... | ... |

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

Guidance:

- `Deduction Ledger` should include one row per actual deduction or hard-fail trigger used in the report.
- `Scorecard` scores must be derivable from the rubric baselines and the rows in `Deduction Ledger`.

