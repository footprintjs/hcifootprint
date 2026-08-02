---
title: JourneyFrame
---

# Interface: JourneyFrame

Defined in: [src/atom/types.ts:1832](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1832)

One committed pass at a journey. 'demoted' = the journey's precondition broke mid-flow.

## Properties

### closedAtVersion?

> `optional` **closedAtVersion?**: `number`

Defined in: [src/atom/types.ts:1847](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1847)

***

### firedSteps

> **firedSteps**: `string`[]

Defined in: [src/atom/types.ts:1840](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1840)

Steps committed while this frame was open (observed fires).

***

### inferredSteps

> **inferredSteps**: `string`[]

Defined in: [src/atom/types.ts:1846](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1846)

Steps attributed by effect-signature INFERENCE while this frame was open
— guesses, kept separate from observed fires. journeyPlan shows them as
'inferred-done' so an agent re-executes only as a visible choice.

***

### journeyId

> **journeyId**: `string`

Defined in: [src/atom/types.ts:1834](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1834)

The journey this frame is open on.

***

### openedAt

> **openedAt**: `number`

Defined in: [src/atom/types.ts:1837](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1837)

***

### openedAtVersion

> **openedAtVersion**: `number`

Defined in: [src/atom/types.ts:1838](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1838)

***

### principal

> **principal**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:1836](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1836)

***

### status

> **status**: [`FrameStatus`](/api/index/type-aliases/FrameStatus)

Defined in: [src/atom/types.ts:1835](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1835)
