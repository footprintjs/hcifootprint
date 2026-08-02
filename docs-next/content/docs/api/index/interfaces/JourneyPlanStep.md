---
title: JourneyPlanStep
---

# Interface: JourneyPlanStep

Defined in: [src/atom/types.ts:1736](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1736)

## Properties

### affordanceId

> **affordanceId**: `string`

Defined in: [src/atom/types.ts:1737](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1737)

***

### blockedOn?

> `optional` **blockedOn?**: `FilterCondition`[]

Defined in: [src/atom/types.ts:1747](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1747)

***

### dependsOn

> **dependsOn**: [`DependencyEdge`](/api/index/interfaces/DependencyEdge)[]

Defined in: [src/atom/types.ts:1745](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1745)

***

### description

> **description**: `string`

Defined in: [src/atom/types.ts:1738](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1738)

***

### guardUnevaluated?

> `optional` **guardUnevaluated?**: `string`[]

Defined in: [src/atom/types.ts:1749](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1749)

Guard keys absent from the state view — the step shows 'ready', taken on faith.

***

### onNodes

> **onNodes**: `string`[]

Defined in: [src/atom/types.ts:1746](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1746)

***

### status

> **status**: [`StepStatus`](/api/index/type-aliases/StepStatus)

Defined in: [src/atom/types.ts:1744](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1744)

'done' = committed while the current frame was open; 'blocked' = guard
fails (see blockedOn); 'ready' = fireable here and now; 'off-node' =
guard passes but the step lives on another page (navigate first).
