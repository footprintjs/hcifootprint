---
title: SkillFrame
---

# Interface: SkillFrame

Defined in: [src/atom/types.ts:1043](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1043)

One committed pass at a skill. 'demoted' = the skill's precondition broke mid-flow.

## Properties

### closedAtVersion?

> `optional` **closedAtVersion?**: `number`

Defined in: [src/atom/types.ts:1057](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1057)

***

### firedSteps

> **firedSteps**: `string`[]

Defined in: [src/atom/types.ts:1050](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1050)

Steps committed while this frame was open (observed fires).

***

### inferredSteps

> **inferredSteps**: `string`[]

Defined in: [src/atom/types.ts:1056](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1056)

Steps attributed by effect-signature INFERENCE while this frame was open
— guesses, kept separate from observed fires. skillPlan shows them as
'inferred-done' so an agent re-executes only as a visible choice.

***

### openedAt

> **openedAt**: `number`

Defined in: [src/atom/types.ts:1047](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1047)

***

### openedAtVersion

> **openedAtVersion**: `number`

Defined in: [src/atom/types.ts:1048](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1048)

***

### principal

> **principal**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:1046](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1046)

***

### skillId

> **skillId**: `string`

Defined in: [src/atom/types.ts:1044](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1044)

***

### status

> **status**: [`FrameStatus`](/api/index/type-aliases/FrameStatus)

Defined in: [src/atom/types.ts:1045](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1045)
