---
title: ConfirmTrailStep
---

# Interface: ConfirmTrailStep

Defined in: [src/atom/types.ts:2883](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2883)

One compact row of the run-so-far trail — authored/structural facts only.

## Properties

### outcome

> **outcome**: [`Settlement`](/api/index/type-aliases/Settlement)

Defined in: [src/atom/types.ts:2889](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2889)

Its settlement outcome.

***

### principal

> **principal**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:2887](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2887)

Who did it.

***

### what

> **what**: `string`

Defined in: [src/atom/types.ts:2885](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2885)

The affordance id (fired rows) or a `stimulus:<kind>` label — never runtime text.
