---
title: ConfirmTrailStep
---

# Interface: ConfirmTrailStep

Defined in: [src/atom/types.ts:1446](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1446)

One compact row of the run-so-far trail — authored/structural facts only.

## Properties

### outcome

> **outcome**: [`Settlement`](/api/index/type-aliases/Settlement)

Defined in: [src/atom/types.ts:1452](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1452)

Its settlement outcome.

***

### principal

> **principal**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:1450](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1450)

Who did it.

***

### what

> **what**: `string`

Defined in: [src/atom/types.ts:1448](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1448)

The affordance id (fired rows) or a `stimulus:<kind>` label — never runtime text.
