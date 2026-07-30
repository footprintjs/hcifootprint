---
title: SkillPlanStep
---

# Interface: SkillPlanStep

Defined in: [src/atom/types.ts:1498](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1498)

## Properties

### affordanceId

> **affordanceId**: `string`

Defined in: [src/atom/types.ts:1499](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1499)

***

### blockedOn?

> `optional` **blockedOn?**: `FilterCondition`[]

Defined in: [src/atom/types.ts:1509](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1509)

***

### dependsOn

> **dependsOn**: [`DependencyEdge`](/api/index/interfaces/DependencyEdge)[]

Defined in: [src/atom/types.ts:1507](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1507)

***

### description

> **description**: `string`

Defined in: [src/atom/types.ts:1500](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1500)

***

### guardUnevaluated?

> `optional` **guardUnevaluated?**: `string`[]

Defined in: [src/atom/types.ts:1511](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1511)

Guard keys absent from the state view — the step shows 'ready', taken on faith.

***

### onNodes

> **onNodes**: `string`[]

Defined in: [src/atom/types.ts:1508](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1508)

***

### status

> **status**: [`StepStatus`](/api/index/type-aliases/StepStatus)

Defined in: [src/atom/types.ts:1506](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1506)

'done' = committed while the current frame was open; 'blocked' = guard
fails (see blockedOn); 'ready' = fireable here and now; 'off-node' =
guard passes but the step lives on another page (navigate first).
