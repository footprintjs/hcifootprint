---
title: JourneyPlanStep
---

# Interface: JourneyPlanStep

Defined in: [src/atom/types.ts:3131](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3131)

## Properties

### affordanceId

> **affordanceId**: `string`

Defined in: [src/atom/types.ts:3132](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3132)

***

### blockedOn?

> `optional` **blockedOn?**: `FilterCondition`[]

Defined in: [src/atom/types.ts:3142](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3142)

***

### dependsOn

> **dependsOn**: [`DependencyEdge`](/api/index/interfaces/DependencyEdge)[]

Defined in: [src/atom/types.ts:3140](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3140)

***

### description

> **description**: `string`

Defined in: [src/atom/types.ts:3133](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3133)

***

### guardUnevaluated?

> `optional` **guardUnevaluated?**: `string`[]

Defined in: [src/atom/types.ts:3144](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3144)

Guard keys absent from the state view — the step shows 'ready', taken on faith.

***

### humanDecides?

> `optional` **humanDecides?**: `true`

Defined in: [src/atom/types.ts:3155](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3155)

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

Defined in: [src/atom/types.ts:3141](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3141)

***

### status

> **status**: [`StepStatus`](/api/index/type-aliases/StepStatus)

Defined in: [src/atom/types.ts:3139](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3139)

'done' = committed while the current frame was open; 'blocked' = guard
fails (see blockedOn); 'ready' = fireable here and now; 'off-node' =
guard passes but the step lives on another page (navigate first).
