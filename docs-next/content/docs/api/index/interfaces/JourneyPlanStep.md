---
title: JourneyPlanStep
---

# Interface: JourneyPlanStep

Defined in: [src/atom/types.ts:3280](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3280)

## Properties

### affordanceId

> **affordanceId**: `string`

Defined in: [src/atom/types.ts:3281](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3281)

***

### blockedOn?

> `optional` **blockedOn?**: `FilterCondition`[]

Defined in: [src/atom/types.ts:3292](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3292)

***

### dependsOn

> **dependsOn**: [`DependencyEdge`](/api/index/interfaces/DependencyEdge)[]

Defined in: [src/atom/types.ts:3290](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3290)

***

### description

> **description**: `string`

Defined in: [src/atom/types.ts:3282](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3282)

***

### guardUnevaluated?

> `optional` **guardUnevaluated?**: `string`[]

Defined in: [src/atom/types.ts:3294](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3294)

Guard keys absent from the state view — the step shows 'ready', taken on faith.

***

### humanDecides?

> `optional` **humanDecides?**: `true`

Defined in: [src/atom/types.ts:3305](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3305)

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

Defined in: [src/atom/types.ts:3291](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3291)

***

### status

> **status**: [`StepStatus`](/api/index/type-aliases/StepStatus)

Defined in: [src/atom/types.ts:3289](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3289)

'done' = a fire in the current frame has a successful retained settlement
and its live record is still committed; 'blocked' = guard
fails (see blockedOn); 'ready' = fireable here and now; 'off-node' =
guard passes but the step lives on another page (navigate first).
