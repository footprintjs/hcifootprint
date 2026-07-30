---
title: SkillPlanStep
---

# Interface: SkillPlanStep

Defined in: [src/atom/types.ts:1284](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1284)

## Properties

### affordanceId

> **affordanceId**: `string`

Defined in: [src/atom/types.ts:1285](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1285)

***

### blockedOn?

> `optional` **blockedOn?**: `FilterCondition`[]

Defined in: [src/atom/types.ts:1295](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1295)

***

### dependsOn

> **dependsOn**: [`DependencyEdge`](/api/index/interfaces/DependencyEdge)[]

Defined in: [src/atom/types.ts:1293](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1293)

***

### description

> **description**: `string`

Defined in: [src/atom/types.ts:1286](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1286)

***

### guardUnevaluated?

> `optional` **guardUnevaluated?**: `string`[]

Defined in: [src/atom/types.ts:1297](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1297)

Guard keys absent from the state view — the step shows 'ready', taken on faith.

***

### onNodes

> **onNodes**: `string`[]

Defined in: [src/atom/types.ts:1294](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1294)

***

### status

> **status**: [`StepStatus`](/api/index/type-aliases/StepStatus)

Defined in: [src/atom/types.ts:1292](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1292)

'done' = committed while the current frame was open; 'blocked' = guard
fails (see blockedOn); 'ready' = fireable here and now; 'off-node' =
guard passes but the step lives on another page (navigate first).
