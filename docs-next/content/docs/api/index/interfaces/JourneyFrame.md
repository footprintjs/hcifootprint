---
title: JourneyFrame
---

# Interface: JourneyFrame

Defined in: [src/atom/types.ts:1763](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1763)

One committed pass at a journey. 'demoted' = the journey's precondition broke mid-flow.

## Properties

### closedAtVersion?

> `optional` **closedAtVersion?**: `number`

Defined in: [src/atom/types.ts:1778](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1778)

***

### firedSteps

> **firedSteps**: `string`[]

Defined in: [src/atom/types.ts:1771](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1771)

Steps committed while this frame was open (observed fires).

***

### inferredSteps

> **inferredSteps**: `string`[]

Defined in: [src/atom/types.ts:1777](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1777)

Steps attributed by effect-signature INFERENCE while this frame was open
— guesses, kept separate from observed fires. journeyPlan shows them as
'inferred-done' so an agent re-executes only as a visible choice.

***

### journeyId

> **journeyId**: `string`

Defined in: [src/atom/types.ts:1765](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1765)

The journey this frame is open on.

***

### openedAt

> **openedAt**: `number`

Defined in: [src/atom/types.ts:1768](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1768)

***

### openedAtVersion

> **openedAtVersion**: `number`

Defined in: [src/atom/types.ts:1769](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1769)

***

### principal

> **principal**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:1767](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1767)

***

### status

> **status**: [`FrameStatus`](/api/index/type-aliases/FrameStatus)

Defined in: [src/atom/types.ts:1766](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1766)
