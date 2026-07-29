---
title: SkillFrame
---

# Interface: SkillFrame

Defined in: [src/atom/types.ts:1034](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1034)

One committed pass at a skill. 'demoted' = the skill's precondition broke mid-flow.

## Properties

### closedAtVersion?

> `optional` **closedAtVersion?**: `number`

Defined in: [src/atom/types.ts:1048](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1048)

***

### firedSteps

> **firedSteps**: `string`[]

Defined in: [src/atom/types.ts:1041](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1041)

Steps committed while this frame was open (observed fires).

***

### inferredSteps

> **inferredSteps**: `string`[]

Defined in: [src/atom/types.ts:1047](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1047)

Steps attributed by effect-signature INFERENCE while this frame was open
— guesses, kept separate from observed fires. skillPlan shows them as
'inferred-done' so an agent re-executes only as a visible choice.

***

### openedAt

> **openedAt**: `number`

Defined in: [src/atom/types.ts:1038](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1038)

***

### openedAtVersion

> **openedAtVersion**: `number`

Defined in: [src/atom/types.ts:1039](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1039)

***

### principal

> **principal**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:1037](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1037)

***

### skillId

> **skillId**: `string`

Defined in: [src/atom/types.ts:1035](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1035)

***

### status

> **status**: [`FrameStatus`](/api/index/type-aliases/FrameStatus)

Defined in: [src/atom/types.ts:1036](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1036)
