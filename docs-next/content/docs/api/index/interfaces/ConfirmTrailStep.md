---
title: ConfirmTrailStep
---

# Interface: ConfirmTrailStep

Defined in: [src/atom/types.ts:1559](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1559)

One compact row of the run-so-far trail — authored/structural facts only.

## Properties

### outcome

> **outcome**: [`Settlement`](/api/index/type-aliases/Settlement)

Defined in: [src/atom/types.ts:1565](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1565)

Its settlement outcome.

***

### principal

> **principal**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:1563](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1563)

Who did it.

***

### what

> **what**: `string`

Defined in: [src/atom/types.ts:1561](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1561)

The affordance id (fired rows) or a `stimulus:<kind>` label — never runtime text.
