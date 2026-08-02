---
title: ConfirmTrailStep
---

# Interface: ConfirmTrailStep

Defined in: [src/atom/types.ts:1490](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1490)

One compact row of the run-so-far trail — authored/structural facts only.

## Properties

### outcome

> **outcome**: [`Settlement`](/api/index/type-aliases/Settlement)

Defined in: [src/atom/types.ts:1496](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1496)

Its settlement outcome.

***

### principal

> **principal**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:1494](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1494)

Who did it.

***

### what

> **what**: `string`

Defined in: [src/atom/types.ts:1492](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1492)

The affordance id (fired rows) or a `stimulus:<kind>` label — never runtime text.
