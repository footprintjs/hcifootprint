---
title: JourneyFrame
---

# Interface: JourneyFrame

Defined in: [src/atom/types.ts:1706](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1706)

One committed pass at a journey. 'demoted' = the journey's precondition broke mid-flow.

## Properties

### closedAtVersion?

> `optional` **closedAtVersion?**: `number`

Defined in: [src/atom/types.ts:1721](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1721)

***

### firedSteps

> **firedSteps**: `string`[]

Defined in: [src/atom/types.ts:1714](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1714)

Steps committed while this frame was open (observed fires).

***

### inferredSteps

> **inferredSteps**: `string`[]

Defined in: [src/atom/types.ts:1720](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1720)

Steps attributed by effect-signature INFERENCE while this frame was open
— guesses, kept separate from observed fires. journeyPlan shows them as
'inferred-done' so an agent re-executes only as a visible choice.

***

### journeyId

> **journeyId**: `string`

Defined in: [src/atom/types.ts:1708](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1708)

The journey this frame is open on.

***

### openedAt

> **openedAt**: `number`

Defined in: [src/atom/types.ts:1711](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1711)

***

### openedAtVersion

> **openedAtVersion**: `number`

Defined in: [src/atom/types.ts:1712](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1712)

***

### principal

> **principal**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:1710](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1710)

***

### status

> **status**: [`FrameStatus`](/api/index/type-aliases/FrameStatus)

Defined in: [src/atom/types.ts:1709](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1709)
