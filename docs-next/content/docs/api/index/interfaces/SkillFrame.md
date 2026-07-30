---
title: SkillFrame
---

# Interface: SkillFrame

Defined in: [src/atom/types.ts:1377](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1377)

One committed pass at a skill. 'demoted' = the skill's precondition broke mid-flow.

## Properties

### closedAtVersion?

> `optional` **closedAtVersion?**: `number`

Defined in: [src/atom/types.ts:1391](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1391)

***

### firedSteps

> **firedSteps**: `string`[]

Defined in: [src/atom/types.ts:1384](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1384)

Steps committed while this frame was open (observed fires).

***

### inferredSteps

> **inferredSteps**: `string`[]

Defined in: [src/atom/types.ts:1390](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1390)

Steps attributed by effect-signature INFERENCE while this frame was open
— guesses, kept separate from observed fires. skillPlan shows them as
'inferred-done' so an agent re-executes only as a visible choice.

***

### openedAt

> **openedAt**: `number`

Defined in: [src/atom/types.ts:1381](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1381)

***

### openedAtVersion

> **openedAtVersion**: `number`

Defined in: [src/atom/types.ts:1382](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1382)

***

### principal

> **principal**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:1380](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1380)

***

### skillId

> **skillId**: `string`

Defined in: [src/atom/types.ts:1378](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1378)

***

### status

> **status**: [`FrameStatus`](/api/index/type-aliases/FrameStatus)

Defined in: [src/atom/types.ts:1379](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1379)
