---
title: ConfirmTrailStep
---

# Interface: ConfirmTrailStep

Defined in: [src/atom/types.ts:1260](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1260)

One compact row of the run-so-far trail — authored/structural facts only.

## Properties

### outcome

> **outcome**: [`Settlement`](/api/index/type-aliases/Settlement)

Defined in: [src/atom/types.ts:1266](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1266)

Its settlement outcome.

***

### principal

> **principal**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:1264](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1264)

Who did it.

***

### what

> **what**: `string`

Defined in: [src/atom/types.ts:1262](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1262)

The affordance id (fired rows) or a `stimulus:<kind>` label — never runtime text.
