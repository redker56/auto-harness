---
module: final-review
kind: rubric
---

# Final Review Rubric

The final report is a summary of actual sprint history and current shipped state. It is not a fresh sprint-level numeric regrade.

## Historical Integrity

- `Sprint Outcomes` must match the actual sprint QA and retest reports that exist on disk.
- Do not smooth away failed, partial, or carried-forward outcomes.
- `Remaining Issues` must honestly preserve unresolved issues from prior history when they still apply.

## Severity Rules

- Severity vocabulary is exactly `P0`, `P1`, `P2`, `P3`.
- Do not use `Major`, `Minor`, or any alternate severity labels.

## Score Summary

- `Score Summary` is a final assessment summary, not a new numeric scorecard.
- It must contain exactly these dimensions:
  - `Product depth`
  - `Functional correctness`
  - `Visual design`
  - `Code quality`
- Each row must include a concrete `Basis` grounded in actual sprint outcomes, remaining issues, or current shipped evidence.
- Do not include thresholds, deduction totals, or recomputed numeric scores.

## Final Result And Recommendation

- `Result: PASS | FAIL` must align with the summarized sprint history, remaining issues, and release recommendation.
- `Release Recommendation` must not claim readiness that contradicts carried-forward blockers or unresolved hard-fail conditions.
- Do not allow an overall pass when unresolved blockers, carried-forward hard failures, or unresolved `P0` issues remain.
