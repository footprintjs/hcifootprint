---
title: ConfirmTrailStep
---

# Interface: ConfirmTrailStep

Defined in: [src/atom/types.ts:790](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L790)

One compact row of the run-so-far trail — authored/structural facts only.

## Properties

### outcome

> **outcome**: [`Settlement`](/api/index/type-aliases/Settlement)

Defined in: [src/atom/types.ts:796](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L796)

Its settlement outcome.

***

### principal

> **principal**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:794](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L794)

Who did it.

***

### what

> **what**: `string`

Defined in: [src/atom/types.ts:792](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L792)

The affordance id (fired rows) or a `stimulus:<kind>` label — never runtime text.
