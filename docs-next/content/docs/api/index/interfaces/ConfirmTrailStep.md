---
title: ConfirmTrailStep
---

# Interface: ConfirmTrailStep

Defined in: [src/atom/types.ts:934](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L934)

One compact row of the run-so-far trail — authored/structural facts only.

## Properties

### outcome

> **outcome**: [`Settlement`](/api/index/type-aliases/Settlement)

Defined in: [src/atom/types.ts:940](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L940)

Its settlement outcome.

***

### principal

> **principal**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:938](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L938)

Who did it.

***

### what

> **what**: `string`

Defined in: [src/atom/types.ts:936](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L936)

The affordance id (fired rows) or a `stimulus:<kind>` label — never runtime text.
