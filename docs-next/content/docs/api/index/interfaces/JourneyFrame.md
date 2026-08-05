---
title: JourneyFrame
---

# Interface: JourneyFrame

Defined in: [src/atom/types.ts:2171](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2171)

One committed pass at a journey. 'demoted' = the journey's precondition broke mid-flow.

## Properties

### closedAtVersion?

> `optional` **closedAtVersion?**: `number`

Defined in: [src/atom/types.ts:2186](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2186)

***

### firedSteps

> **firedSteps**: `string`[]

Defined in: [src/atom/types.ts:2179](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2179)

Steps committed while this frame was open (observed fires).

***

### inferredSteps

> **inferredSteps**: `string`[]

Defined in: [src/atom/types.ts:2185](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2185)

Steps attributed by effect-signature INFERENCE while this frame was open
— guesses, kept separate from observed fires. journeyPlan shows them as
'inferred-done' so an agent re-executes only as a visible choice.

***

### journeyId

> **journeyId**: `string`

Defined in: [src/atom/types.ts:2173](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2173)

The journey this frame is open on.

***

### openedAt

> **openedAt**: `number`

Defined in: [src/atom/types.ts:2176](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2176)

***

### openedAtVersion

> **openedAtVersion**: `number`

Defined in: [src/atom/types.ts:2177](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2177)

***

### principal

> **principal**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:2175](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2175)

***

### status

> **status**: [`FrameStatus`](/api/index/type-aliases/FrameStatus)

Defined in: [src/atom/types.ts:2174](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2174)
