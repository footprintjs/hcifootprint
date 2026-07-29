---
title: SkillPlanStep
---

# Interface: SkillPlanStep

Defined in: [src/atom/types.ts:863](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L863)

## Properties

### affordanceId

> **affordanceId**: `string`

Defined in: [src/atom/types.ts:864](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L864)

***

### blockedOn?

> `optional` **blockedOn?**: `FilterCondition`[]

Defined in: [src/atom/types.ts:874](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L874)

***

### dependsOn

> **dependsOn**: [`DependencyEdge`](/api/index/interfaces/DependencyEdge)[]

Defined in: [src/atom/types.ts:872](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L872)

***

### description

> **description**: `string`

Defined in: [src/atom/types.ts:865](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L865)

***

### guardUnevaluated?

> `optional` **guardUnevaluated?**: `string`[]

Defined in: [src/atom/types.ts:876](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L876)

Guard keys absent from the state view — the step shows 'ready', taken on faith.

***

### onNodes

> **onNodes**: `string`[]

Defined in: [src/atom/types.ts:873](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L873)

***

### status

> **status**: [`StepStatus`](/api/index/type-aliases/StepStatus)

Defined in: [src/atom/types.ts:871](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L871)

'done' = committed while the current frame was open; 'blocked' = guard
fails (see blockedOn); 'ready' = fireable here and now; 'off-node' =
guard passes but the step lives on another page (navigate first).
