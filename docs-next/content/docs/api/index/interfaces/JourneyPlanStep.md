---
title: JourneyPlanStep
---

# Interface: JourneyPlanStep

Defined in: [src/atom/types.ts:1679](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1679)

## Properties

### affordanceId

> **affordanceId**: `string`

Defined in: [src/atom/types.ts:1680](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1680)

***

### blockedOn?

> `optional` **blockedOn?**: `FilterCondition`[]

Defined in: [src/atom/types.ts:1690](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1690)

***

### dependsOn

> **dependsOn**: [`DependencyEdge`](/api/index/interfaces/DependencyEdge)[]

Defined in: [src/atom/types.ts:1688](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1688)

***

### description

> **description**: `string`

Defined in: [src/atom/types.ts:1681](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1681)

***

### guardUnevaluated?

> `optional` **guardUnevaluated?**: `string`[]

Defined in: [src/atom/types.ts:1692](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1692)

Guard keys absent from the state view — the step shows 'ready', taken on faith.

***

### onNodes

> **onNodes**: `string`[]

Defined in: [src/atom/types.ts:1689](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1689)

***

### status

> **status**: [`StepStatus`](/api/index/type-aliases/StepStatus)

Defined in: [src/atom/types.ts:1687](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1687)

'done' = committed while the current frame was open; 'blocked' = guard
fails (see blockedOn); 'ready' = fireable here and now; 'off-node' =
guard passes but the step lives on another page (navigate first).
