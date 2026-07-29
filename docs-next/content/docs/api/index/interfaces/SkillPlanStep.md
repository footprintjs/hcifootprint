---
title: SkillPlanStep
---

# Interface: SkillPlanStep

Defined in: [src/atom/types.ts:1017](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1017)

## Properties

### affordanceId

> **affordanceId**: `string`

Defined in: [src/atom/types.ts:1018](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1018)

***

### blockedOn?

> `optional` **blockedOn?**: `FilterCondition`[]

Defined in: [src/atom/types.ts:1028](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1028)

***

### dependsOn

> **dependsOn**: [`DependencyEdge`](/api/index/interfaces/DependencyEdge)[]

Defined in: [src/atom/types.ts:1026](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1026)

***

### description

> **description**: `string`

Defined in: [src/atom/types.ts:1019](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1019)

***

### guardUnevaluated?

> `optional` **guardUnevaluated?**: `string`[]

Defined in: [src/atom/types.ts:1030](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1030)

Guard keys absent from the state view — the step shows 'ready', taken on faith.

***

### onNodes

> **onNodes**: `string`[]

Defined in: [src/atom/types.ts:1027](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1027)

***

### status

> **status**: [`StepStatus`](/api/index/type-aliases/StepStatus)

Defined in: [src/atom/types.ts:1025](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1025)

'done' = committed while the current frame was open; 'blocked' = guard
fails (see blockedOn); 'ready' = fireable here and now; 'off-node' =
guard passes but the step lives on another page (navigate first).
