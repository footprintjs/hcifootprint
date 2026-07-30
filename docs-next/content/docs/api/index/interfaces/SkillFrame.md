---
title: SkillFrame
---

# Interface: SkillFrame

Defined in: [src/atom/types.ts:1310](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1310)

One committed pass at a skill. 'demoted' = the skill's precondition broke mid-flow.

## Properties

### closedAtVersion?

> `optional` **closedAtVersion?**: `number`

Defined in: [src/atom/types.ts:1324](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1324)

***

### firedSteps

> **firedSteps**: `string`[]

Defined in: [src/atom/types.ts:1317](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1317)

Steps committed while this frame was open (observed fires).

***

### inferredSteps

> **inferredSteps**: `string`[]

Defined in: [src/atom/types.ts:1323](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1323)

Steps attributed by effect-signature INFERENCE while this frame was open
— guesses, kept separate from observed fires. skillPlan shows them as
'inferred-done' so an agent re-executes only as a visible choice.

***

### openedAt

> **openedAt**: `number`

Defined in: [src/atom/types.ts:1314](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1314)

***

### openedAtVersion

> **openedAtVersion**: `number`

Defined in: [src/atom/types.ts:1315](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1315)

***

### principal

> **principal**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:1313](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1313)

***

### skillId

> **skillId**: `string`

Defined in: [src/atom/types.ts:1311](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1311)

***

### status

> **status**: [`FrameStatus`](/api/index/type-aliases/FrameStatus)

Defined in: [src/atom/types.ts:1312](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1312)
