---
title: SkillPlanStep
---

# Interface: SkillPlanStep

Defined in: [src/atom/types.ts:1008](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1008)

## Properties

### affordanceId

> **affordanceId**: `string`

Defined in: [src/atom/types.ts:1009](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1009)

***

### blockedOn?

> `optional` **blockedOn?**: `FilterCondition`[]

Defined in: [src/atom/types.ts:1019](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1019)

***

### dependsOn

> **dependsOn**: [`DependencyEdge`](/api/index/interfaces/DependencyEdge)[]

Defined in: [src/atom/types.ts:1017](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1017)

***

### description

> **description**: `string`

Defined in: [src/atom/types.ts:1010](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1010)

***

### guardUnevaluated?

> `optional` **guardUnevaluated?**: `string`[]

Defined in: [src/atom/types.ts:1021](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1021)

Guard keys absent from the state view — the step shows 'ready', taken on faith.

***

### onNodes

> **onNodes**: `string`[]

Defined in: [src/atom/types.ts:1018](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1018)

***

### status

> **status**: [`StepStatus`](/api/index/type-aliases/StepStatus)

Defined in: [src/atom/types.ts:1016](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1016)

'done' = committed while the current frame was open; 'blocked' = guard
fails (see blockedOn); 'ready' = fireable here and now; 'off-node' =
guard passes but the step lives on another page (navigate first).
