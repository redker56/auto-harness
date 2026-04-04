---
module: product-depth
kind: rubric
applies_to: [evaluator]
exports:
  - product_depth_rules
---

# Product Depth Rubric

Score `10` at the start. Apply deductions below. Minimum score is `0`.

## Definitions

- **Primary path** means the main end-to-end user path named in the sprint contract. If the contract does not explicitly mark a primary path, use the shortest end-to-end path that demonstrates the sprint's core promise.
- **Secondary contracted behavior** means any in-scope contract item that is either:
  - explicitly marked secondary in the sprint contract, or
  - listed as in-scope but not part of the primary path.

## Hard Fail Conditions

- Fail the sprint if a named sprint deliverable is still a placeholder, stub, or "coming soon" surface where the contract expected working product behavior.
- Fail the sprint if the primary path cannot be completed end-to-end because one or more required contracted states or transitions are absent or disconnected.

## Deductions

### 1. Scope coverage

- Subtract `2` if an in-scope contracted capability is absent from the delivered product surface, even if related files, routes, or state scaffolding exist.
- Subtract `1` if a contracted capability is present only as a shell, partial surface, or one-sided implementation and does not expose the complete user-facing slice the sprint promised.
- Subtract `1` if a secondary contracted behavior is omitted or deferred without that deferral being explicitly reflected in the approved contract or review.
- Maximum deduction for this section: `4`.

### 2. Flow completeness

- Subtract `1` if the primary path can only be demonstrated as disconnected pieces rather than as one coherent end-to-end flow.
- Subtract `1` if a required transition between contracted states is absent from the delivered product surface, for example list to detail, create to confirmation, or edit to persisted result.
- Subtract `1` if the sprint mostly exposes primitives, data, or layout shells instead of a usable end-to-end product slice.
- Maximum deduction for this section: `3`.

### 3. Surface completeness and specificity

- Subtract `1` if `2+` user-facing states required by the contract still use placeholder labels, placeholder copy, or undifferentiated generic framing where the contract expected distinct product surfaces.
- Subtract `1` if defaults, empty states, or action labels required to make the shipped slice understandable are absent across `2+` key user-facing surfaces.
- Subtract `1` if the sprint adds files, screens, or components without exposing a new in-scope user capability end-to-end.
- Maximum deduction for this section: `3`.

## Non-deduction rules

- Do not deduct product depth for isolated implementation bugs; score those under functional correctness.
- Do not deduct product depth when a capability is present end-to-end but buggy in isolated cases; score those failures under functional correctness.
- Do not deduct product depth for purely visual polish issues; score those under visual design.
- Do not deduct for items explicitly deferred to later sprints in the approved contract or review.
- Do not reward raw file count or component count by itself; score the delivered product behavior.

## Evidence Rules

- Every deduction should cite contract behaviors, visible product states, or concrete source locations.
- Judge against the approved sprint contract, not against imagined future scope.

## Score Interpretation

- `9-10`: the sprint delivers a clear, complete product slice with coherent end-to-end behavior
- `7-8`: the sprint passes; the promised slice is real and usable, with some thin or missing secondary depth
- `5-6`: the delivered slice is shallow, fragmented, or materially incomplete relative to the contract
- `0-4`: the sprint is mostly scaffolding, placeholders, or disconnected fragments
