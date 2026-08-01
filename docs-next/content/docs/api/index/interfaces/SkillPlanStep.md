---
title: SkillPlanStep
---

# Interface: SkillPlanStep

Defined in: [src/atom/types.ts:1699](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1699)

## Properties

### affordanceId

> **affordanceId**: `string`

Defined in: [src/atom/types.ts:1700](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1700)

***

### blockedOn?

> `optional` **blockedOn?**: `FilterCondition`[]

Defined in: [src/atom/types.ts:1710](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1710)

***

### dependsOn

> **dependsOn**: [`DependencyEdge`](/api/index/interfaces/DependencyEdge)[]

Defined in: [src/atom/types.ts:1708](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1708)

***

### description

> **description**: `string`

Defined in: [src/atom/types.ts:1701](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1701)

***

### guardUnevaluated?

> `optional` **guardUnevaluated?**: `string`[]

Defined in: [src/atom/types.ts:1712](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1712)

Guard keys absent from the state view — the step shows 'ready', taken on faith.

***

### onNodes

> **onNodes**: `string`[]

Defined in: [src/atom/types.ts:1709](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1709)

***

### status

> **status**: [`StepStatus`](/api/index/type-aliases/StepStatus)

Defined in: [src/atom/types.ts:1707](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1707)

'done' = committed while the current frame was open; 'blocked' = guard
fails (see blockedOn); 'ready' = fireable here and now; 'off-node' =
guard passes but the step lives on another page (navigate first).
