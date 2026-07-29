---
title: SkillPlanStep
---

# Interface: SkillPlanStep

Defined in: [src/atom/types.ts:897](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L897)

## Properties

### affordanceId

> **affordanceId**: `string`

Defined in: [src/atom/types.ts:898](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L898)

***

### blockedOn?

> `optional` **blockedOn?**: `FilterCondition`[]

Defined in: [src/atom/types.ts:908](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L908)

***

### dependsOn

> **dependsOn**: [`DependencyEdge`](/api/index/interfaces/DependencyEdge)[]

Defined in: [src/atom/types.ts:906](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L906)

***

### description

> **description**: `string`

Defined in: [src/atom/types.ts:899](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L899)

***

### guardUnevaluated?

> `optional` **guardUnevaluated?**: `string`[]

Defined in: [src/atom/types.ts:910](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L910)

Guard keys absent from the state view — the step shows 'ready', taken on faith.

***

### onNodes

> **onNodes**: `string`[]

Defined in: [src/atom/types.ts:907](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L907)

***

### status

> **status**: [`StepStatus`](/api/index/type-aliases/StepStatus)

Defined in: [src/atom/types.ts:905](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L905)

'done' = committed while the current frame was open; 'blocked' = guard
fails (see blockedOn); 'ready' = fireable here and now; 'off-node' =
guard passes but the step lives on another page (navigate first).
