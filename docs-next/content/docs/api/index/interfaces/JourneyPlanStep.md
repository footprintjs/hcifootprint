---
title: JourneyPlanStep
---

# Interface: JourneyPlanStep

Defined in: [src/atom/types.ts:3284](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3284)

## Properties

### affordanceId

> **affordanceId**: `string`

Defined in: [src/atom/types.ts:3285](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3285)

***

### blockedOn?

> `optional` **blockedOn?**: `FilterCondition`[]

Defined in: [src/atom/types.ts:3295](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3295)

***

### dependsOn

> **dependsOn**: [`DependencyEdge`](/api/index/interfaces/DependencyEdge)[]

Defined in: [src/atom/types.ts:3293](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3293)

***

### description

> **description**: `string`

Defined in: [src/atom/types.ts:3286](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3286)

***

### guardUnevaluated?

> `optional` **guardUnevaluated?**: `string`[]

Defined in: [src/atom/types.ts:3297](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3297)

Guard keys absent from the state view — the step shows 'ready', taken on faith.

***

### humanDecides?

> `optional` **humanDecides?**: `true`

Defined in: [src/atom/types.ts:3308](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3308)

THE DECISION AT THIS STEP IS A PERSON'S — the presence stamp
[AvailableEdge.humanDecides](/api/index/interfaces/AvailableEdge#humandecides) carries, on the plan row, so a serving
layer reads it off the plan instead of re-deriving it per row. Per-step
conditional facts already live here, beside `blockedOn` and
`guardUnevaluated`.

Presence-only, and [StepStatus](/api/index/type-aliases/StepStatus) does NOT grow for it: the hold is a
list membership in a frame result, not a status word.

***

### onNodes

> **onNodes**: `string`[]

Defined in: [src/atom/types.ts:3294](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3294)

***

### status

> **status**: [`StepStatus`](/api/index/type-aliases/StepStatus)

Defined in: [src/atom/types.ts:3292](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3292)

'done' = committed while the current frame was open; 'blocked' = guard
fails (see blockedOn); 'ready' = fireable here and now; 'off-node' =
guard passes but the step lives on another page (navigate first).
