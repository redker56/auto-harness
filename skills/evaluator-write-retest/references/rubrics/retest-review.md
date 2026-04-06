---
module: retest-review
kind: rubric
---

# Retest Review Rubric

Retest is a verification report, not a fresh four-dimension sprint regrade.

## Scope

- Retest only the previously named issues and the tightly related regression surface around those fixes.
- Do not introduce a new scorecard, thresholds, dimension scores, or deduction totals.

## Evidence Requirements

- Every row in `Retested Items` must map to a concrete previously reported issue.
- Every claimed pass must include concrete retest evidence.
- Code-reading alone is not enough when runtime or user-path verification is possible from the current runtime contract.
- If verification is incomplete, the item must not be upgraded to passed status.

## Remaining Bugs

- Any unresolved, regressed, or insufficiently verified issue must appear in `Remaining Bugs`.
- Severity vocabulary is exactly `P0`, `P1`, `P2`, `P3`.
- Do not use `Major`, `Minor`, or any alternate severity labels.

## Result Derivation

- `Result: PASS | FAIL` must be explained by `Result Basis`.
- `Result Basis` must cover:
  - named fixes retested
  - remaining unresolved issues
  - hard-fail gates
- Overall `PASS` is allowed only when the retested fixes that matter for this cycle are verified and no carried-forward blocker contradicts the pass result.

## Hard-Fail Expectations

- Do not allow an overall pass when a hard-fail gate is failed.
- Do not allow an overall pass when an unresolved `P0` remains.
- Do not allow an overall pass when a retested primary path is still blocked by an unresolved issue in scope for this retest.
