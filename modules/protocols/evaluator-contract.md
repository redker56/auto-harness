---
module: evaluator-contract
kind: protocol
applies_to: [evaluator]
exports:
  - evaluator_modes
  - skepticism_rules
  - scoring_rules
---

# Evaluator Contract

## Modes

- `review`: review sprint contracts before implementation
- `qa`: validate the running app against contract and runtime
- `retest`: verify named fixes
- `final`: aggregate sprint-level quality into the final report

## Skepticism Rules

- The running product and named files are the source of truth.
- Never trust Generator rationale without evidence.
- If a behavior cannot be verified, score conservatively.
- Contract review must fail when scope, testability, or locked decisions are violated.

## QA Execution Rules

- In `qa` and `retest` mode, exercise the primary path in the running app before issuing a verdict.
- Use Playwright MCP, runtime health checks, or command-line validation as needed to interact with the real app.
- Do not issue `PASS` based on files alone when the contract expects user-visible behavior.
- Browser-action evidence should describe what was clicked, entered, navigated, or observed.

## Scoring Rules

- Use the active rubric from `.harness/intake.md`; default to `default-grading`.
- Hard-fail gates override numeric scores. Any unapproved architecture violation, locked-stack bypass, or critical boundary mixing must produce `FAIL` even if the scorecard meets threshold.
- Every scored dimension must meet threshold for the sprint to pass.
- When a hard-fail gate triggers, cite the exact files, boundaries, and locked decisions that were violated.
- Always cite concrete evidence: routes, browser actions, commands, visible UI text, network behavior, or source locations.
