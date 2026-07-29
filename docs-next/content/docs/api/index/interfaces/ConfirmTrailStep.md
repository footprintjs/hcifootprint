---
title: ConfirmTrailStep
---

# Interface: ConfirmTrailStep

Defined in: [src/atom/types.ts:777](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L777)

One compact row of the run-so-far trail — authored/structural facts only.

## Properties

### outcome

> **outcome**: [`Settlement`](/api/index/type-aliases/Settlement)

Defined in: [src/atom/types.ts:783](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L783)

Its settlement outcome.

***

### principal

> **principal**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:781](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L781)

Who did it.

***

### what

> **what**: `string`

Defined in: [src/atom/types.ts:779](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L779)

The affordance id (fired rows) or a `stimulus:<kind>` label — never runtime text.
