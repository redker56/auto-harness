---
module: code-quality
kind: rubric
---

# Code Quality Rubric

Score `10` at the start. Apply deductions below. Minimum score is `0`.

## Deductions

### 1. Duplication

- Subtract `1` if the same logic block of `8+` lines appears in `2` places with only variable or value changes and no shared abstraction.
- Subtract `2` instead if the same logic block appears in `3+` places.
- Do not deduct for simple JSX or UI repetition when there is no shared behavior or branching logic.

### 2. Naming and local readability

- Subtract `1` if `2+` identifiers in the same file use names that do not reveal purpose, such as `data`, `temp`, `handle`, or `item2`, and the reviewer must read implementation details to understand them.
- Subtract `1` if a function longer than `60` lines contains `3+` branches or loops and is not split into named helpers.
- Maximum deduction for this section: `2`.

### 3. File or module responsibility

- Subtract `1` if one file contains `2+` unrelated responsibilities from this list:
  - rendering UI
  - fetching data
  - transforming domain data
  - state orchestration
  - persistence or storage
- Subtract `1` if a module exports APIs for `2+` unrelated domains.
- Maximum deduction for this section: `2`.

### 4. Error, empty, loading, and cleanup handling

- For each core async path, subtract `1` if a required state is missing:
  - loading state
  - error state
  - empty state when the user-facing flow can legitimately yield no results
- Subtract `1` if side effects with subscriptions, timers, or listeners have no cleanup.
- Maximum deduction for this section: `2`.

### 5. Architectural compliance

- Subtract `1` if code crosses a locked boundary directly, for example:
  - UI imports infra or database code directly
  - feature code bypasses a shared API layer
  - a component reaches into unrelated feature internals
- Subtract `1` if a new state, data, or API pattern is introduced where an approved project-wide pattern already exists and no code comment explains why.
- Maximum deduction for this section: `2`.

### 6. API or interface consistency

- Subtract `1` if the same concept is represented with inconsistent names or shapes in `2+` modules, for example:
  - `userId` vs `uid`
  - `onSubmit(data)` vs `submitForm(payload)`
  - `{ loading }` vs `{ isLoading }` for the same layer pattern
- Subtract `1` if a component or module requires callers to know hidden ordering, hidden defaults, or implicit side effects to use it correctly.
- Maximum deduction for this section: `2`.

## Non-deduction rules

- Do not deduct for lack of abstraction unless the duplication threshold is met.
- Do not deduct for temporary sprint shortcuts if:
  - the code is isolated to one file, and
  - a comment or ticket reference explains the shortcut.
- Do not deduct code quality for visual polish issues.
- Do not deduct code quality for product scope gaps.
- Do not deduct the same problem twice across code quality and functional correctness.
- Functional bugs should be scored in `bug-severity`, not here, unless the deduction is specifically about the missing handling structure listed above.

## Evidence Rules

- Every deduction should cite file and location evidence whenever practical.
- Use this rubric to explain why the score changed, not just to produce a number.

## Score Interpretation

- `9-10`: clean, maintainable, no material structural issues
- `7-8`: passes threshold, some debt exists but does not block extension
- `5-6`: noticeable maintenance risk, below expected sprint quality
- `0-4`: hard to extend safely, substantial refactor likely required

