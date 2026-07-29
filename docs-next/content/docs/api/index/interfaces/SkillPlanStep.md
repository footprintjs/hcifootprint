---
title: SkillPlanStep
---

# Interface: SkillPlanStep

Defined in: [src/atom/types.ts:883](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L883)

## Properties

### affordanceId

> **affordanceId**: `string`

Defined in: [src/atom/types.ts:884](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L884)

***

### blockedOn?

> `optional` **blockedOn?**: `FilterCondition`[]

Defined in: [src/atom/types.ts:894](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L894)

***

### dependsOn

> **dependsOn**: [`DependencyEdge`](/api/index/interfaces/DependencyEdge)[]

Defined in: [src/atom/types.ts:892](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L892)

***

### description

> **description**: `string`

Defined in: [src/atom/types.ts:885](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L885)

***

### guardUnevaluated?

> `optional` **guardUnevaluated?**: `string`[]

Defined in: [src/atom/types.ts:896](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L896)

Guard keys absent from the state view — the step shows 'ready', taken on faith.

***

### onNodes

> **onNodes**: `string`[]

Defined in: [src/atom/types.ts:893](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L893)

***

### status

> **status**: [`StepStatus`](/api/index/type-aliases/StepStatus)

Defined in: [src/atom/types.ts:891](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L891)

'done' = committed while the current frame was open; 'blocked' = guard
fails (see blockedOn); 'ready' = fireable here and now; 'off-node' =
guard passes but the step lives on another page (navigate first).
