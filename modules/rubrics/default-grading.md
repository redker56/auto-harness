---
module: default-grading
kind: rubric
applies_to: [evaluator]
---

# Default Grading

All four dimensions must meet threshold for the sprint to pass.

| Dimension | Threshold | Baseline |
| --- | --- | --- |
| Product depth | 7 | Core sprint scope is actually present |
| Functional correctness | 8 | Contract behaviors pass in practice |
| Visual design | 6 | UI is coherent and usable |
| Code quality | 7 | Code is readable and reasonably structured |

Use the dimension rubrics below to apply deductions consistently:

- `product-depth.md` for Product depth
- `bug-severity.md` for Functional correctness
- `visual-design.md` for Visual design
- `code-quality.md` for Code quality
