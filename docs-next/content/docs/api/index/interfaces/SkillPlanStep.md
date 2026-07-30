---
title: SkillPlanStep
---

# Interface: SkillPlanStep

Defined in: [src/atom/types.ts:1351](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1351)

## Properties

### affordanceId

> **affordanceId**: `string`

Defined in: [src/atom/types.ts:1352](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1352)

***

### blockedOn?

> `optional` **blockedOn?**: `FilterCondition`[]

Defined in: [src/atom/types.ts:1362](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1362)

***

### dependsOn

> **dependsOn**: [`DependencyEdge`](/api/index/interfaces/DependencyEdge)[]

Defined in: [src/atom/types.ts:1360](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1360)

***

### description

> **description**: `string`

Defined in: [src/atom/types.ts:1353](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1353)

***

### guardUnevaluated?

> `optional` **guardUnevaluated?**: `string`[]

Defined in: [src/atom/types.ts:1364](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1364)

Guard keys absent from the state view — the step shows 'ready', taken on faith.

***

### onNodes

> **onNodes**: `string`[]

Defined in: [src/atom/types.ts:1361](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1361)

***

### status

> **status**: [`StepStatus`](/api/index/type-aliases/StepStatus)

Defined in: [src/atom/types.ts:1359](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1359)

'done' = committed while the current frame was open; 'blocked' = guard
fails (see blockedOn); 'ready' = fireable here and now; 'off-node' =
guard passes but the step lives on another page (navigate first).
