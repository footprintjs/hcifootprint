---
title: SkillFrame
---

# Interface: SkillFrame

Defined in: [src/atom/types.ts:1524](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1524)

One committed pass at a skill. 'demoted' = the skill's precondition broke mid-flow.

## Properties

### closedAtVersion?

> `optional` **closedAtVersion?**: `number`

Defined in: [src/atom/types.ts:1538](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1538)

***

### firedSteps

> **firedSteps**: `string`[]

Defined in: [src/atom/types.ts:1531](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1531)

Steps committed while this frame was open (observed fires).

***

### inferredSteps

> **inferredSteps**: `string`[]

Defined in: [src/atom/types.ts:1537](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1537)

Steps attributed by effect-signature INFERENCE while this frame was open
— guesses, kept separate from observed fires. skillPlan shows them as
'inferred-done' so an agent re-executes only as a visible choice.

***

### openedAt

> **openedAt**: `number`

Defined in: [src/atom/types.ts:1528](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1528)

***

### openedAtVersion

> **openedAtVersion**: `number`

Defined in: [src/atom/types.ts:1529](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1529)

***

### principal

> **principal**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:1527](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1527)

***

### skillId

> **skillId**: `string`

Defined in: [src/atom/types.ts:1525](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1525)

***

### status

> **status**: [`FrameStatus`](/api/index/type-aliases/FrameStatus)

Defined in: [src/atom/types.ts:1526](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1526)
