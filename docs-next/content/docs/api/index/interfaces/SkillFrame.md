---
title: SkillFrame
---

# Interface: SkillFrame

Defined in: [src/atom/types.ts:889](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L889)

One committed pass at a skill. 'demoted' = the skill's precondition broke mid-flow.

## Properties

### closedAtVersion?

> `optional` **closedAtVersion?**: `number`

Defined in: [src/atom/types.ts:903](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L903)

***

### firedSteps

> **firedSteps**: `string`[]

Defined in: [src/atom/types.ts:896](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L896)

Steps committed while this frame was open (observed fires).

***

### inferredSteps

> **inferredSteps**: `string`[]

Defined in: [src/atom/types.ts:902](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L902)

Steps attributed by effect-signature INFERENCE while this frame was open
— guesses, kept separate from observed fires. skillPlan shows them as
'inferred-done' so an agent re-executes only as a visible choice.

***

### openedAt

> **openedAt**: `number`

Defined in: [src/atom/types.ts:893](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L893)

***

### openedAtVersion

> **openedAtVersion**: `number`

Defined in: [src/atom/types.ts:894](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L894)

***

### principal

> **principal**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:892](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L892)

***

### skillId

> **skillId**: `string`

Defined in: [src/atom/types.ts:890](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L890)

***

### status

> **status**: [`FrameStatus`](/api/index/type-aliases/FrameStatus)

Defined in: [src/atom/types.ts:891](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L891)
