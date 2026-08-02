---
title: JourneyFrame
---

# Interface: JourneyFrame

Defined in: [src/atom/types.ts:2066](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2066)

One committed pass at a journey. 'demoted' = the journey's precondition broke mid-flow.

## Properties

### closedAtVersion?

> `optional` **closedAtVersion?**: `number`

Defined in: [src/atom/types.ts:2081](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2081)

***

### firedSteps

> **firedSteps**: `string`[]

Defined in: [src/atom/types.ts:2074](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2074)

Steps committed while this frame was open (observed fires).

***

### inferredSteps

> **inferredSteps**: `string`[]

Defined in: [src/atom/types.ts:2080](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2080)

Steps attributed by effect-signature INFERENCE while this frame was open
— guesses, kept separate from observed fires. journeyPlan shows them as
'inferred-done' so an agent re-executes only as a visible choice.

***

### journeyId

> **journeyId**: `string`

Defined in: [src/atom/types.ts:2068](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2068)

The journey this frame is open on.

***

### openedAt

> **openedAt**: `number`

Defined in: [src/atom/types.ts:2071](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2071)

***

### openedAtVersion

> **openedAtVersion**: `number`

Defined in: [src/atom/types.ts:2072](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2072)

***

### principal

> **principal**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:2070](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2070)

***

### status

> **status**: [`FrameStatus`](/api/index/type-aliases/FrameStatus)

Defined in: [src/atom/types.ts:2069](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2069)
