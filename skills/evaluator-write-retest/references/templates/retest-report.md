---
module: retest-report-template
kind: template
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

## Result Basis
| Basis | Status | Evidence | Notes |
| --- | --- | --- | --- |
| Named fixes retested | PASS | ... | ... |
| Remaining unresolved issues | PASS | ... | ... |
| Hard-fail gates | PASS | ... | ... |

## Verdict
- ...
```

Guidance:

- Retest only the named fixes and any tightly related regression surface.
- Do not silently upgrade unresolved issues to passed status.
- Do not include a four-dimension scorecard, thresholds, or numeric regrading in a retest report.

