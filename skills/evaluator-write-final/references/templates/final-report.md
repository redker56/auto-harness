---
module: final-report-template
kind: template
---

# Final Report Template

```md
# Final QA Report

Result: PASS | FAIL

## Build Summary
- ...

## Sprint Outcomes
| Sprint | Result | Notes |
| --- | --- | --- |

## Remaining Issues
| ID | Severity | Summary | Notes |
| --- | --- | --- | --- |

## Score Summary
| Dimension | Final Assessment | Basis | Notes |
| --- | --- | --- | --- |
| Product depth | PASS | ... | ... |
| Functional correctness | PASS | ... | ... |
| Visual design | PASS | ... | ... |
| Code quality | PASS | ... | ... |

## Release Recommendation
- ...
```

Guidance:

- Summarize the actual build that exists, not the intended roadmap.
- Highlight residual risks that a user or maintainer should know before release.
- Do not turn `Score Summary` into a new numeric scorecard with thresholds or deduction totals.

