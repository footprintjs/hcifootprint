---
title: SkillPlanStep
---

# Interface: SkillPlanStep

Defined in: [src/atom/types.ts:870](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L870)

## Properties

### affordanceId

> **affordanceId**: `string`

Defined in: [src/atom/types.ts:871](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L871)

***

### blockedOn?

> `optional` **blockedOn?**: `FilterCondition`[]

Defined in: [src/atom/types.ts:881](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L881)

***

### dependsOn

> **dependsOn**: [`DependencyEdge`](/api/index/interfaces/DependencyEdge)[]

Defined in: [src/atom/types.ts:879](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L879)

***

### description

> **description**: `string`

Defined in: [src/atom/types.ts:872](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L872)

***

### guardUnevaluated?

> `optional` **guardUnevaluated?**: `string`[]

Defined in: [src/atom/types.ts:883](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L883)

Guard keys absent from the state view — the step shows 'ready', taken on faith.

***

### onNodes

> **onNodes**: `string`[]

Defined in: [src/atom/types.ts:880](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L880)

***

### status

> **status**: [`StepStatus`](/api/index/type-aliases/StepStatus)

Defined in: [src/atom/types.ts:878](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L878)

'done' = committed while the current frame was open; 'blocked' = guard
fails (see blockedOn); 'ready' = fireable here and now; 'off-node' =
guard passes but the step lives on another page (navigate first).
