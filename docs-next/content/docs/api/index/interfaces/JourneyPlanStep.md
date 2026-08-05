---
title: JourneyPlanStep
---

# Interface: JourneyPlanStep

Defined in: [src/atom/types.ts:2133](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2133)

## Properties

### affordanceId

> **affordanceId**: `string`

Defined in: [src/atom/types.ts:2134](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2134)

***

### blockedOn?

> `optional` **blockedOn?**: `FilterCondition`[]

Defined in: [src/atom/types.ts:2144](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2144)

***

### dependsOn

> **dependsOn**: [`DependencyEdge`](/api/index/interfaces/DependencyEdge)[]

Defined in: [src/atom/types.ts:2142](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2142)

***

### description

> **description**: `string`

Defined in: [src/atom/types.ts:2135](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2135)

***

### guardUnevaluated?

> `optional` **guardUnevaluated?**: `string`[]

Defined in: [src/atom/types.ts:2146](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2146)

Guard keys absent from the state view — the step shows 'ready', taken on faith.

***

### humanDecides?

> `optional` **humanDecides?**: `true`

Defined in: [src/atom/types.ts:2157](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2157)

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

Defined in: [src/atom/types.ts:2143](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2143)

***

### status

> **status**: [`StepStatus`](/api/index/type-aliases/StepStatus)

Defined in: [src/atom/types.ts:2141](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2141)

'done' = committed while the current frame was open; 'blocked' = guard
fails (see blockedOn); 'ready' = fireable here and now; 'off-node' =
guard passes but the step lives on another page (navigate first).
