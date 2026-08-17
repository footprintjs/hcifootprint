---
title: ResolverOutcome<State>
---

# Interface: ResolverOutcome\<State\>

Defined in: [src/testing/harness.ts:48](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L48)

## Type Parameters

### State

`State` = `Record`\<`string`, `unknown`\>

## Properties

### goTo?

> `optional` **goTo?**: `string`

Defined in: [src/testing/harness.ts:58](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L58)

Navigate to this page after the delta (like the app's router confirming).

***

### patch?

> `optional` **patch?**: `Partial`\<`State`\> & `Record`\<`string`, `unknown`\>

Defined in: [src/testing/harness.ts:56](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L56)

The state change this action makes — reported through the REAL updateState,
so the session verifies it against the action's declared writes. Keep it
EXPLICIT (do not mirror effect.writes) or the drift check rubber-stamps
itself: the whole value is that the graph's claim and the mock's real delta
are independent.

***

### produced?

> `optional` **produced?**: `unknown`

Defined in: [src/testing/harness.ts:60](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L60)

The "act → data back" return value (search results, a looked-up record).
