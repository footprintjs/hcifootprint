---
title: JourneyFrame
---

# Interface: JourneyFrame

Defined in: [src/atom/types.ts:3323](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3323)

One committed pass at a journey. 'demoted' = the journey's precondition broke mid-flow.

## Properties

### closedAtVersion?

> `optional` **closedAtVersion?**: `number`

Defined in: [src/atom/types.ts:3338](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3338)

***

### firedSteps

> **firedSteps**: `string`[]

Defined in: [src/atom/types.ts:3331](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3331)

Steps committed while this frame was open (observed fires).

***

### inferredSteps

> **inferredSteps**: `string`[]

Defined in: [src/atom/types.ts:3337](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3337)

Steps attributed by effect-signature INFERENCE while this frame was open
— guesses, kept separate from observed fires. journeyPlan shows them as
'inferred-done' so an agent re-executes only as a visible choice.

***

### journeyId

> **journeyId**: `string`

Defined in: [src/atom/types.ts:3325](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3325)

The journey this frame is open on.

***

### openedAt

> **openedAt**: `number`

Defined in: [src/atom/types.ts:3328](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3328)

***

### openedAtVersion

> **openedAtVersion**: `number`

Defined in: [src/atom/types.ts:3329](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3329)

***

### principal

> **principal**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:3327](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3327)

***

### status

> **status**: [`FrameStatus`](/api/index/type-aliases/FrameStatus)

Defined in: [src/atom/types.ts:3326](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3326)
