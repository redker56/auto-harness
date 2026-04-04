---
module: bug-severity
kind: rubric
applies_to: [evaluator]
---

# Bug Severity

This rubric supports **Functional correctness** scoring.

severity_levels:

- P0: core behavior is broken, data is corrupted, or the app is effectively unusable
- P1: important behavior is broken, unreliable, or seriously misleading; workaround may exist
- P2: noticeable defect in quality, UX, or non-core behavior that does not block core use
- P3: minor polish issue with limited user impact

scoring_rules:
  start_functional_correctness: 10

  deductions:
    - P0: fail sprint
    - P1: -2 each
    - P2: -0.5 each
    - P3: -0.25 each

  caps:
    - max_p2_deduction: -2
    - max_p3_deduction: -1

hard_fail_conditions:

- any unresolved P0
- any unresolved data-loss, auth, permission, or security bug
- primary user path cannot be completed
