---
title: JourneyFrame
---

# Interface: JourneyFrame

Defined in: [src/atom/types.ts:3123](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3123)

One committed pass at a journey. 'demoted' = the journey's precondition broke mid-flow.

## Properties

### closedAtVersion?

> `optional` **closedAtVersion?**: `number`

Defined in: [src/atom/types.ts:3138](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3138)

***

### firedSteps

> **firedSteps**: `string`[]

Defined in: [src/atom/types.ts:3131](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3131)

Steps committed while this frame was open (observed fires).

***

### inferredSteps

> **inferredSteps**: `string`[]

Defined in: [src/atom/types.ts:3137](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3137)

Steps attributed by effect-signature INFERENCE while this frame was open
— guesses, kept separate from observed fires. journeyPlan shows them as
'inferred-done' so an agent re-executes only as a visible choice.

***

### journeyId

> **journeyId**: `string`

Defined in: [src/atom/types.ts:3125](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3125)

The journey this frame is open on.

***

### openedAt

> **openedAt**: `number`

Defined in: [src/atom/types.ts:3128](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3128)

***

### openedAtVersion

> **openedAtVersion**: `number`

Defined in: [src/atom/types.ts:3129](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3129)

***

### principal

> **principal**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:3127](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3127)

***

### status

> **status**: [`FrameStatus`](/api/index/type-aliases/FrameStatus)

Defined in: [src/atom/types.ts:3126](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3126)
