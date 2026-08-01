---
title: SkillFrame
---

# Interface: SkillFrame

Defined in: [src/atom/types.ts:1725](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1725)

One committed pass at a skill. 'demoted' = the skill's precondition broke mid-flow.

## Properties

### closedAtVersion?

> `optional` **closedAtVersion?**: `number`

Defined in: [src/atom/types.ts:1739](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1739)

***

### firedSteps

> **firedSteps**: `string`[]

Defined in: [src/atom/types.ts:1732](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1732)

Steps committed while this frame was open (observed fires).

***

### inferredSteps

> **inferredSteps**: `string`[]

Defined in: [src/atom/types.ts:1738](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1738)

Steps attributed by effect-signature INFERENCE while this frame was open
— guesses, kept separate from observed fires. skillPlan shows them as
'inferred-done' so an agent re-executes only as a visible choice.

***

### openedAt

> **openedAt**: `number`

Defined in: [src/atom/types.ts:1729](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1729)

***

### openedAtVersion

> **openedAtVersion**: `number`

Defined in: [src/atom/types.ts:1730](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1730)

***

### principal

> **principal**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:1728](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1728)

***

### skillId

> **skillId**: `string`

Defined in: [src/atom/types.ts:1726](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1726)

***

### status

> **status**: [`FrameStatus`](/api/index/type-aliases/FrameStatus)

Defined in: [src/atom/types.ts:1727](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1727)
