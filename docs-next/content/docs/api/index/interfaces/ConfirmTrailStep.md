---
title: ConfirmTrailStep
---

# Interface: ConfirmTrailStep

Defined in: [src/atom/types.ts:1763](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1763)

One compact row of the run-so-far trail — authored/structural facts only.

## Properties

### outcome

> **outcome**: [`Settlement`](/api/index/type-aliases/Settlement)

Defined in: [src/atom/types.ts:1769](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1769)

Its settlement outcome.

***

### principal

> **principal**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:1767](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1767)

Who did it.

***

### what

> **what**: `string`

Defined in: [src/atom/types.ts:1765](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1765)

The affordance id (fired rows) or a `stimulus:<kind>` label — never runtime text.
