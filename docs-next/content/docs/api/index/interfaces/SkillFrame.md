---
title: SkillFrame
---

# Interface: SkillFrame

Defined in: [src/atom/types.ts:1053](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1053)

One committed pass at a skill. 'demoted' = the skill's precondition broke mid-flow.

## Properties

### closedAtVersion?

> `optional` **closedAtVersion?**: `number`

Defined in: [src/atom/types.ts:1067](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1067)

***

### firedSteps

> **firedSteps**: `string`[]

Defined in: [src/atom/types.ts:1060](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1060)

Steps committed while this frame was open (observed fires).

***

### inferredSteps

> **inferredSteps**: `string`[]

Defined in: [src/atom/types.ts:1066](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1066)

Steps attributed by effect-signature INFERENCE while this frame was open
— guesses, kept separate from observed fires. skillPlan shows them as
'inferred-done' so an agent re-executes only as a visible choice.

***

### openedAt

> **openedAt**: `number`

Defined in: [src/atom/types.ts:1057](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1057)

***

### openedAtVersion

> **openedAtVersion**: `number`

Defined in: [src/atom/types.ts:1058](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1058)

***

### principal

> **principal**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:1056](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1056)

***

### skillId

> **skillId**: `string`

Defined in: [src/atom/types.ts:1054](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1054)

***

### status

> **status**: [`FrameStatus`](/api/index/type-aliases/FrameStatus)

Defined in: [src/atom/types.ts:1055](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1055)
