---
title: ConfirmTrailStep
---

# Interface: ConfirmTrailStep

Defined in: [src/atom/types.ts:1154](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1154)

One compact row of the run-so-far trail — authored/structural facts only.

## Properties

### outcome

> **outcome**: [`Settlement`](/api/index/type-aliases/Settlement)

Defined in: [src/atom/types.ts:1160](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1160)

Its settlement outcome.

***

### principal

> **principal**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:1158](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1158)

Who did it.

***

### what

> **what**: `string`

Defined in: [src/atom/types.ts:1156](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1156)

The affordance id (fired rows) or a `stimulus:<kind>` label — never runtime text.
