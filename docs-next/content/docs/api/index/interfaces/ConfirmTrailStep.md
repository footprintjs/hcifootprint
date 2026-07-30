---
title: ConfirmTrailStep
---

# Interface: ConfirmTrailStep

Defined in: [src/atom/types.ts:1087](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1087)

One compact row of the run-so-far trail — authored/structural facts only.

## Properties

### outcome

> **outcome**: [`Settlement`](/api/index/type-aliases/Settlement)

Defined in: [src/atom/types.ts:1093](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1093)

Its settlement outcome.

***

### principal

> **principal**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:1091](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1091)

Who did it.

***

### what

> **what**: `string`

Defined in: [src/atom/types.ts:1089](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1089)

The affordance id (fired rows) or a `stimulus:<kind>` label — never runtime text.
