---
title: ConfirmTrailStep
---

# Interface: ConfirmTrailStep

Defined in: [src/atom/types.ts:2698](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2698)

One compact row of the run-so-far trail — authored/structural facts only.

## Properties

### outcome

> **outcome**: [`Settlement`](/api/index/type-aliases/Settlement)

Defined in: [src/atom/types.ts:2704](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2704)

Its settlement outcome.

***

### principal

> **principal**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:2702](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2702)

Who did it.

***

### what

> **what**: `string`

Defined in: [src/atom/types.ts:2700](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2700)

The affordance id (fired rows) or a `stimulus:<kind>` label — never runtime text.
