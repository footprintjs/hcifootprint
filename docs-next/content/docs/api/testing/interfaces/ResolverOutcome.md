---
title: ResolverOutcome<State>
---

# Interface: ResolverOutcome\<State\>

Defined in: [src/testing/harness.ts:47](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L47)

## Type Parameters

### State

`State`

## Properties

### goTo?

> `optional` **goTo?**: `string`

Defined in: [src/testing/harness.ts:57](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L57)

Navigate to this page after the delta (like the app's router confirming).

***

### patch?

> `optional` **patch?**: `Partial`\<`State`\> & `Record`\<`string`, `unknown`\>

Defined in: [src/testing/harness.ts:55](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L55)

The state change this action makes — reported through the REAL updateState,
so the session verifies it against the action's declared writes. Keep it
EXPLICIT (do not mirror effect.writes) or the drift check rubber-stamps
itself: the whole value is that the graph's claim and the mock's real delta
are independent.

***

### produced?

> `optional` **produced?**: `unknown`

Defined in: [src/testing/harness.ts:59](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L59)

The "act → data back" return value (search results, a looked-up record).
