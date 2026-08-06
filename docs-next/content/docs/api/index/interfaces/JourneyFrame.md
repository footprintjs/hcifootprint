---
title: JourneyFrame
---

# Interface: JourneyFrame

Defined in: [src/atom/types.ts:2188](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2188)

One committed pass at a journey. 'demoted' = the journey's precondition broke mid-flow.

## Properties

### closedAtVersion?

> `optional` **closedAtVersion?**: `number`

Defined in: [src/atom/types.ts:2203](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2203)

***

### firedSteps

> **firedSteps**: `string`[]

Defined in: [src/atom/types.ts:2196](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2196)

Steps committed while this frame was open (observed fires).

***

### inferredSteps

> **inferredSteps**: `string`[]

Defined in: [src/atom/types.ts:2202](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2202)

Steps attributed by effect-signature INFERENCE while this frame was open
— guesses, kept separate from observed fires. journeyPlan shows them as
'inferred-done' so an agent re-executes only as a visible choice.

***

### journeyId

> **journeyId**: `string`

Defined in: [src/atom/types.ts:2190](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2190)

The journey this frame is open on.

***

### openedAt

> **openedAt**: `number`

Defined in: [src/atom/types.ts:2193](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2193)

***

### openedAtVersion

> **openedAtVersion**: `number`

Defined in: [src/atom/types.ts:2194](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2194)

***

### principal

> **principal**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:2192](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2192)

***

### status

> **status**: [`FrameStatus`](/api/index/type-aliases/FrameStatus)

Defined in: [src/atom/types.ts:2191](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2191)
