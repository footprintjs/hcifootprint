---
title: JourneyFrame
---

# Interface: JourneyFrame

Defined in: [src/atom/types.ts:3291](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3291)

One committed pass at a journey. 'demoted' = the journey's precondition broke mid-flow.

## Properties

### closedAtVersion?

> `optional` **closedAtVersion?**: `number`

Defined in: [src/atom/types.ts:3306](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3306)

***

### firedSteps

> **firedSteps**: `string`[]

Defined in: [src/atom/types.ts:3299](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3299)

Steps committed while this frame was open (observed fires).

***

### inferredSteps

> **inferredSteps**: `string`[]

Defined in: [src/atom/types.ts:3305](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3305)

Steps attributed by effect-signature INFERENCE while this frame was open
— guesses, kept separate from observed fires. journeyPlan shows them as
'inferred-done' so an agent re-executes only as a visible choice.

***

### journeyId

> **journeyId**: `string`

Defined in: [src/atom/types.ts:3293](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3293)

The journey this frame is open on.

***

### openedAt

> **openedAt**: `number`

Defined in: [src/atom/types.ts:3296](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3296)

***

### openedAtVersion

> **openedAtVersion**: `number`

Defined in: [src/atom/types.ts:3297](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3297)

***

### principal

> **principal**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:3295](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3295)

***

### status

> **status**: [`FrameStatus`](/api/index/type-aliases/FrameStatus)

Defined in: [src/atom/types.ts:3294](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3294)
