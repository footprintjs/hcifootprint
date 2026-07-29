---
title: SkillPlanStep
---

# Interface: SkillPlanStep

Defined in: [src/atom/types.ts:1027](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1027)

## Properties

### affordanceId

> **affordanceId**: `string`

Defined in: [src/atom/types.ts:1028](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1028)

***

### blockedOn?

> `optional` **blockedOn?**: `FilterCondition`[]

Defined in: [src/atom/types.ts:1038](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1038)

***

### dependsOn

> **dependsOn**: [`DependencyEdge`](/api/index/interfaces/DependencyEdge)[]

Defined in: [src/atom/types.ts:1036](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1036)

***

### description

> **description**: `string`

Defined in: [src/atom/types.ts:1029](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1029)

***

### guardUnevaluated?

> `optional` **guardUnevaluated?**: `string`[]

Defined in: [src/atom/types.ts:1040](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1040)

Guard keys absent from the state view — the step shows 'ready', taken on faith.

***

### onNodes

> **onNodes**: `string`[]

Defined in: [src/atom/types.ts:1037](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1037)

***

### status

> **status**: [`StepStatus`](/api/index/type-aliases/StepStatus)

Defined in: [src/atom/types.ts:1035](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1035)

'done' = committed while the current frame was open; 'blocked' = guard
fails (see blockedOn); 'ready' = fireable here and now; 'off-node' =
guard passes but the step lives on another page (navigate first).
