---
title: JourneyFrame
---

# Interface: JourneyFrame

Defined in: [src/atom/types.ts:3322](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3322)

One committed pass at a journey. 'demoted' = the journey's precondition broke mid-flow.

## Properties

### closedAtVersion?

> `optional` **closedAtVersion?**: `number`

Defined in: [src/atom/types.ts:3337](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3337)

***

### firedSteps

> **firedSteps**: `string`[]

Defined in: [src/atom/types.ts:3330](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3330)

Steps committed while this frame was open (observed fires).

***

### inferredSteps

> **inferredSteps**: `string`[]

Defined in: [src/atom/types.ts:3336](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3336)

Steps attributed by effect-signature INFERENCE while this frame was open
— guesses, kept separate from observed fires. journeyPlan shows them as
'inferred-done' so an agent re-executes only as a visible choice.

***

### journeyId

> **journeyId**: `string`

Defined in: [src/atom/types.ts:3324](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3324)

The journey this frame is open on.

***

### openedAt

> **openedAt**: `number`

Defined in: [src/atom/types.ts:3327](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3327)

***

### openedAtVersion

> **openedAtVersion**: `number`

Defined in: [src/atom/types.ts:3328](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3328)

***

### principal

> **principal**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:3326](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3326)

***

### status

> **status**: [`FrameStatus`](/api/index/type-aliases/FrameStatus)

Defined in: [src/atom/types.ts:3325](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3325)
