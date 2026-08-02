---
title: ConfirmTrailStep
---

# Interface: ConfirmTrailStep

Defined in: [src/atom/types.ts:1670](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1670)

One compact row of the run-so-far trail — authored/structural facts only.

## Properties

### outcome

> **outcome**: [`Settlement`](/api/index/type-aliases/Settlement)

Defined in: [src/atom/types.ts:1676](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1676)

Its settlement outcome.

***

### principal

> **principal**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:1674](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1674)

Who did it.

***

### what

> **what**: `string`

Defined in: [src/atom/types.ts:1672](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1672)

The affordance id (fired rows) or a `stimulus:<kind>` label — never runtime text.
