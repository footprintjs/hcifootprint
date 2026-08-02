---
title: JourneyPlanStep
---

# Interface: JourneyPlanStep

Defined in: [src/atom/types.ts:2028](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2028)

## Properties

### affordanceId

> **affordanceId**: `string`

Defined in: [src/atom/types.ts:2029](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2029)

***

### blockedOn?

> `optional` **blockedOn?**: `FilterCondition`[]

Defined in: [src/atom/types.ts:2039](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2039)

***

### dependsOn

> **dependsOn**: [`DependencyEdge`](/api/index/interfaces/DependencyEdge)[]

Defined in: [src/atom/types.ts:2037](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2037)

***

### description

> **description**: `string`

Defined in: [src/atom/types.ts:2030](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2030)

***

### guardUnevaluated?

> `optional` **guardUnevaluated?**: `string`[]

Defined in: [src/atom/types.ts:2041](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2041)

Guard keys absent from the state view — the step shows 'ready', taken on faith.

***

### humanDecides?

> `optional` **humanDecides?**: `true`

Defined in: [src/atom/types.ts:2052](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2052)

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

Defined in: [src/atom/types.ts:2038](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2038)

***

### status

> **status**: [`StepStatus`](/api/index/type-aliases/StepStatus)

Defined in: [src/atom/types.ts:2036](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2036)

'done' = committed while the current frame was open; 'blocked' = guard
fails (see blockedOn); 'ready' = fireable here and now; 'off-node' =
guard passes but the step lives on another page (navigate first).
