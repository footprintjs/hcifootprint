---
title: SkillFrame
---

# Interface: SkillFrame

Defined in: [src/atom/types.ts:1710](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1710)

One committed pass at a skill. 'demoted' = the skill's precondition broke mid-flow.

## Properties

### closedAtVersion?

> `optional` **closedAtVersion?**: `number`

Defined in: [src/atom/types.ts:1724](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1724)

***

### firedSteps

> **firedSteps**: `string`[]

Defined in: [src/atom/types.ts:1717](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1717)

Steps committed while this frame was open (observed fires).

***

### inferredSteps

> **inferredSteps**: `string`[]

Defined in: [src/atom/types.ts:1723](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1723)

Steps attributed by effect-signature INFERENCE while this frame was open
— guesses, kept separate from observed fires. skillPlan shows them as
'inferred-done' so an agent re-executes only as a visible choice.

***

### openedAt

> **openedAt**: `number`

Defined in: [src/atom/types.ts:1714](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1714)

***

### openedAtVersion

> **openedAtVersion**: `number`

Defined in: [src/atom/types.ts:1715](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1715)

***

### principal

> **principal**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:1713](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1713)

***

### skillId

> **skillId**: `string`

Defined in: [src/atom/types.ts:1711](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1711)

***

### status

> **status**: [`FrameStatus`](/api/index/type-aliases/FrameStatus)

Defined in: [src/atom/types.ts:1712](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1712)
