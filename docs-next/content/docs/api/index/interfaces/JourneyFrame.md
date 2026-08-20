---
title: JourneyFrame
---

# Interface: JourneyFrame

Defined in: [src/atom/types.ts:3169](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3169)

One committed pass at a journey. 'demoted' = the journey's precondition broke mid-flow.

## Properties

### closedAtVersion?

> `optional` **closedAtVersion?**: `number`

Defined in: [src/atom/types.ts:3184](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3184)

***

### firedSteps

> **firedSteps**: `string`[]

Defined in: [src/atom/types.ts:3177](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3177)

Steps committed while this frame was open (observed fires).

***

### inferredSteps

> **inferredSteps**: `string`[]

Defined in: [src/atom/types.ts:3183](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3183)

Steps attributed by effect-signature INFERENCE while this frame was open
— guesses, kept separate from observed fires. journeyPlan shows them as
'inferred-done' so an agent re-executes only as a visible choice.

***

### journeyId

> **journeyId**: `string`

Defined in: [src/atom/types.ts:3171](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3171)

The journey this frame is open on.

***

### openedAt

> **openedAt**: `number`

Defined in: [src/atom/types.ts:3174](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3174)

***

### openedAtVersion

> **openedAtVersion**: `number`

Defined in: [src/atom/types.ts:3175](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3175)

***

### principal

> **principal**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:3173](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3173)

***

### status

> **status**: [`FrameStatus`](/api/index/type-aliases/FrameStatus)

Defined in: [src/atom/types.ts:3172](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3172)
