---
title: SkillFrame
---

# Interface: SkillFrame

Defined in: [src/atom/types.ts:909](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L909)

One committed pass at a skill. 'demoted' = the skill's precondition broke mid-flow.

## Properties

### closedAtVersion?

> `optional` **closedAtVersion?**: `number`

Defined in: [src/atom/types.ts:923](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L923)

***

### firedSteps

> **firedSteps**: `string`[]

Defined in: [src/atom/types.ts:916](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L916)

Steps committed while this frame was open (observed fires).

***

### inferredSteps

> **inferredSteps**: `string`[]

Defined in: [src/atom/types.ts:922](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L922)

Steps attributed by effect-signature INFERENCE while this frame was open
— guesses, kept separate from observed fires. skillPlan shows them as
'inferred-done' so an agent re-executes only as a visible choice.

***

### openedAt

> **openedAt**: `number`

Defined in: [src/atom/types.ts:913](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L913)

***

### openedAtVersion

> **openedAtVersion**: `number`

Defined in: [src/atom/types.ts:914](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L914)

***

### principal

> **principal**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:912](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L912)

***

### skillId

> **skillId**: `string`

Defined in: [src/atom/types.ts:910](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L910)

***

### status

> **status**: [`FrameStatus`](/api/index/type-aliases/FrameStatus)

Defined in: [src/atom/types.ts:911](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L911)
