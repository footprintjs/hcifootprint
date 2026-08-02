---
title: JourneyPlanStep
---

# Interface: JourneyPlanStep

Defined in: [src/atom/types.ts:1805](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1805)

## Properties

### affordanceId

> **affordanceId**: `string`

Defined in: [src/atom/types.ts:1806](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1806)

***

### blockedOn?

> `optional` **blockedOn?**: `FilterCondition`[]

Defined in: [src/atom/types.ts:1816](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1816)

***

### dependsOn

> **dependsOn**: [`DependencyEdge`](/api/index/interfaces/DependencyEdge)[]

Defined in: [src/atom/types.ts:1814](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1814)

***

### description

> **description**: `string`

Defined in: [src/atom/types.ts:1807](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1807)

***

### guardUnevaluated?

> `optional` **guardUnevaluated?**: `string`[]

Defined in: [src/atom/types.ts:1818](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1818)

Guard keys absent from the state view — the step shows 'ready', taken on faith.

***

### onNodes

> **onNodes**: `string`[]

Defined in: [src/atom/types.ts:1815](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1815)

***

### status

> **status**: [`StepStatus`](/api/index/type-aliases/StepStatus)

Defined in: [src/atom/types.ts:1813](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1813)

'done' = committed while the current frame was open; 'blocked' = guard
fails (see blockedOn); 'ready' = fireable here and now; 'off-node' =
guard passes but the step lives on another page (navigate first).
