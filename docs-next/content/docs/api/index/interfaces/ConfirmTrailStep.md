---
title: ConfirmTrailStep
---

# Interface: ConfirmTrailStep

Defined in: [src/atom/types.ts:2852](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2852)

One compact row of the run-so-far trail — authored/structural facts only.

## Properties

### outcome

> **outcome**: [`Settlement`](/api/index/type-aliases/Settlement)

Defined in: [src/atom/types.ts:2858](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2858)

Its settlement outcome.

***

### principal

> **principal**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:2856](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2856)

Who did it.

***

### what

> **what**: `string`

Defined in: [src/atom/types.ts:2854](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2854)

The affordance id (fired rows) or a `stimulus:<kind>` label — never runtime text.
