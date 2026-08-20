---
title: JourneyPlanStep
---

# Interface: JourneyPlanStep

Defined in: [src/atom/types.ts:3253](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3253)

## Properties

### affordanceId

> **affordanceId**: `string`

Defined in: [src/atom/types.ts:3254](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3254)

***

### blockedOn?

> `optional` **blockedOn?**: `FilterCondition`[]

Defined in: [src/atom/types.ts:3264](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3264)

***

### dependsOn

> **dependsOn**: [`DependencyEdge`](/api/index/interfaces/DependencyEdge)[]

Defined in: [src/atom/types.ts:3262](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3262)

***

### description

> **description**: `string`

Defined in: [src/atom/types.ts:3255](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3255)

***

### guardUnevaluated?

> `optional` **guardUnevaluated?**: `string`[]

Defined in: [src/atom/types.ts:3266](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3266)

Guard keys absent from the state view — the step shows 'ready', taken on faith.

***

### humanDecides?

> `optional` **humanDecides?**: `true`

Defined in: [src/atom/types.ts:3277](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3277)

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

Defined in: [src/atom/types.ts:3263](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3263)

***

### status

> **status**: [`StepStatus`](/api/index/type-aliases/StepStatus)

Defined in: [src/atom/types.ts:3261](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3261)

'done' = committed while the current frame was open; 'blocked' = guard
fails (see blockedOn); 'ready' = fireable here and now; 'off-node' =
guard passes but the step lives on another page (navigate first).
