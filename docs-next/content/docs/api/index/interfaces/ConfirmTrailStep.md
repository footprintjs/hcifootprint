---
title: ConfirmTrailStep
---

# Interface: ConfirmTrailStep

Defined in: [src/atom/types.ts:1441](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1441)

One compact row of the run-so-far trail — authored/structural facts only.

## Properties

### outcome

> **outcome**: [`Settlement`](/api/index/type-aliases/Settlement)

Defined in: [src/atom/types.ts:1447](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1447)

Its settlement outcome.

***

### principal

> **principal**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:1445](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1445)

Who did it.

***

### what

> **what**: `string`

Defined in: [src/atom/types.ts:1443](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1443)

The affordance id (fired rows) or a `stimulus:<kind>` label — never runtime text.
