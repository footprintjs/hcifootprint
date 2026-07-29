---
title: ConfirmTrailStep
---

# Interface: ConfirmTrailStep

Defined in: [src/atom/types.ts:915](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L915)

One compact row of the run-so-far trail — authored/structural facts only.

## Properties

### outcome

> **outcome**: [`Settlement`](/api/index/type-aliases/Settlement)

Defined in: [src/atom/types.ts:921](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L921)

Its settlement outcome.

***

### principal

> **principal**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:919](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L919)

Who did it.

***

### what

> **what**: `string`

Defined in: [src/atom/types.ts:917](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L917)

The affordance id (fired rows) or a `stimulus:<kind>` label — never runtime text.
