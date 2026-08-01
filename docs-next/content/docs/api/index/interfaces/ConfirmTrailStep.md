---
title: ConfirmTrailStep
---

# Interface: ConfirmTrailStep

Defined in: [src/atom/types.ts:1461](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1461)

One compact row of the run-so-far trail — authored/structural facts only.

## Properties

### outcome

> **outcome**: [`Settlement`](/api/index/type-aliases/Settlement)

Defined in: [src/atom/types.ts:1467](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1467)

Its settlement outcome.

***

### principal

> **principal**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:1465](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1465)

Who did it.

***

### what

> **what**: `string`

Defined in: [src/atom/types.ts:1463](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1463)

The affordance id (fired rows) or a `stimulus:<kind>` label — never runtime text.
