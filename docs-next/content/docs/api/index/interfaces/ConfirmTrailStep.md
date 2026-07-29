---
title: ConfirmTrailStep
---

# Interface: ConfirmTrailStep

Defined in: [src/atom/types.ts:770](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L770)

One compact row of the run-so-far trail — authored/structural facts only.

## Properties

### outcome

> **outcome**: [`Settlement`](/api/index/type-aliases/Settlement)

Defined in: [src/atom/types.ts:776](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L776)

Its settlement outcome.

***

### principal

> **principal**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:774](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L774)

Who did it.

***

### what

> **what**: `string`

Defined in: [src/atom/types.ts:772](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L772)

The affordance id (fired rows) or a `stimulus:<kind>` label — never runtime text.
