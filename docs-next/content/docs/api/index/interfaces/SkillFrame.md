---
title: SkillFrame
---

# Interface: SkillFrame

Defined in: [src/atom/types.ts:896](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L896)

One committed pass at a skill. 'demoted' = the skill's precondition broke mid-flow.

## Properties

### closedAtVersion?

> `optional` **closedAtVersion?**: `number`

Defined in: [src/atom/types.ts:910](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L910)

***

### firedSteps

> **firedSteps**: `string`[]

Defined in: [src/atom/types.ts:903](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L903)

Steps committed while this frame was open (observed fires).

***

### inferredSteps

> **inferredSteps**: `string`[]

Defined in: [src/atom/types.ts:909](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L909)

Steps attributed by effect-signature INFERENCE while this frame was open
— guesses, kept separate from observed fires. skillPlan shows them as
'inferred-done' so an agent re-executes only as a visible choice.

***

### openedAt

> **openedAt**: `number`

Defined in: [src/atom/types.ts:900](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L900)

***

### openedAtVersion

> **openedAtVersion**: `number`

Defined in: [src/atom/types.ts:901](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L901)

***

### principal

> **principal**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:899](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L899)

***

### skillId

> **skillId**: `string`

Defined in: [src/atom/types.ts:897](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L897)

***

### status

> **status**: [`FrameStatus`](/api/index/type-aliases/FrameStatus)

Defined in: [src/atom/types.ts:898](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L898)
