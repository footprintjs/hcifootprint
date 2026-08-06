---
title: JourneyPlanStep
---

# Interface: JourneyPlanStep

Defined in: [src/atom/types.ts:2150](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2150)

## Properties

### affordanceId

> **affordanceId**: `string`

Defined in: [src/atom/types.ts:2151](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2151)

***

### blockedOn?

> `optional` **blockedOn?**: `FilterCondition`[]

Defined in: [src/atom/types.ts:2161](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2161)

***

### dependsOn

> **dependsOn**: [`DependencyEdge`](/api/index/interfaces/DependencyEdge)[]

Defined in: [src/atom/types.ts:2159](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2159)

***

### description

> **description**: `string`

Defined in: [src/atom/types.ts:2152](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2152)

***

### guardUnevaluated?

> `optional` **guardUnevaluated?**: `string`[]

Defined in: [src/atom/types.ts:2163](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2163)

Guard keys absent from the state view — the step shows 'ready', taken on faith.

***

### humanDecides?

> `optional` **humanDecides?**: `true`

Defined in: [src/atom/types.ts:2174](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2174)

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

Defined in: [src/atom/types.ts:2160](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2160)

***

### status

> **status**: [`StepStatus`](/api/index/type-aliases/StepStatus)

Defined in: [src/atom/types.ts:2158](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2158)

'done' = committed while the current frame was open; 'blocked' = guard
fails (see blockedOn); 'ready' = fireable here and now; 'off-node' =
guard passes but the step lives on another page (navigate first).
