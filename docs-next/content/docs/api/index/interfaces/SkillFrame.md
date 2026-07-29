---
title: SkillFrame
---

# Interface: SkillFrame

Defined in: [src/atom/types.ts:923](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L923)

One committed pass at a skill. 'demoted' = the skill's precondition broke mid-flow.

## Properties

### closedAtVersion?

> `optional` **closedAtVersion?**: `number`

Defined in: [src/atom/types.ts:937](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L937)

***

### firedSteps

> **firedSteps**: `string`[]

Defined in: [src/atom/types.ts:930](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L930)

Steps committed while this frame was open (observed fires).

***

### inferredSteps

> **inferredSteps**: `string`[]

Defined in: [src/atom/types.ts:936](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L936)

Steps attributed by effect-signature INFERENCE while this frame was open
— guesses, kept separate from observed fires. skillPlan shows them as
'inferred-done' so an agent re-executes only as a visible choice.

***

### openedAt

> **openedAt**: `number`

Defined in: [src/atom/types.ts:927](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L927)

***

### openedAtVersion

> **openedAtVersion**: `number`

Defined in: [src/atom/types.ts:928](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L928)

***

### principal

> **principal**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:926](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L926)

***

### skillId

> **skillId**: `string`

Defined in: [src/atom/types.ts:924](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L924)

***

### status

> **status**: [`FrameStatus`](/api/index/type-aliases/FrameStatus)

Defined in: [src/atom/types.ts:925](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L925)
