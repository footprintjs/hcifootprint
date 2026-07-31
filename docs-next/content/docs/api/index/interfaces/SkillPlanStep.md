---
title: SkillPlanStep
---

# Interface: SkillPlanStep

Defined in: [src/atom/types.ts:1684](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1684)

## Properties

### affordanceId

> **affordanceId**: `string`

Defined in: [src/atom/types.ts:1685](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1685)

***

### blockedOn?

> `optional` **blockedOn?**: `FilterCondition`[]

Defined in: [src/atom/types.ts:1695](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1695)

***

### dependsOn

> **dependsOn**: [`DependencyEdge`](/api/index/interfaces/DependencyEdge)[]

Defined in: [src/atom/types.ts:1693](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1693)

***

### description

> **description**: `string`

Defined in: [src/atom/types.ts:1686](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1686)

***

### guardUnevaluated?

> `optional` **guardUnevaluated?**: `string`[]

Defined in: [src/atom/types.ts:1697](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1697)

Guard keys absent from the state view — the step shows 'ready', taken on faith.

***

### onNodes

> **onNodes**: `string`[]

Defined in: [src/atom/types.ts:1694](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1694)

***

### status

> **status**: [`StepStatus`](/api/index/type-aliases/StepStatus)

Defined in: [src/atom/types.ts:1692](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1692)

'done' = committed while the current frame was open; 'blocked' = guard
fails (see blockedOn); 'ready' = fireable here and now; 'off-node' =
guard passes but the step lives on another page (navigate first).
