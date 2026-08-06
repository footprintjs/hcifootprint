---
title: JourneyPlanStep
---

# Interface: JourneyPlanStep

Defined in: [src/atom/types.ts:3085](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3085)

## Properties

### affordanceId

> **affordanceId**: `string`

Defined in: [src/atom/types.ts:3086](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3086)

***

### blockedOn?

> `optional` **blockedOn?**: `FilterCondition`[]

Defined in: [src/atom/types.ts:3096](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3096)

***

### dependsOn

> **dependsOn**: [`DependencyEdge`](/api/index/interfaces/DependencyEdge)[]

Defined in: [src/atom/types.ts:3094](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3094)

***

### description

> **description**: `string`

Defined in: [src/atom/types.ts:3087](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3087)

***

### guardUnevaluated?

> `optional` **guardUnevaluated?**: `string`[]

Defined in: [src/atom/types.ts:3098](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3098)

Guard keys absent from the state view — the step shows 'ready', taken on faith.

***

### humanDecides?

> `optional` **humanDecides?**: `true`

Defined in: [src/atom/types.ts:3109](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3109)

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

Defined in: [src/atom/types.ts:3095](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3095)

***

### status

> **status**: [`StepStatus`](/api/index/type-aliases/StepStatus)

Defined in: [src/atom/types.ts:3093](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3093)

'done' = committed while the current frame was open; 'blocked' = guard
fails (see blockedOn); 'ready' = fireable here and now; 'off-node' =
guard passes but the step lives on another page (navigate first).
