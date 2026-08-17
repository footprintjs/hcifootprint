---
title: TestAppOptions<State>
---

# Interface: TestAppOptions\<State\>

Defined in: [src/testing/harness.ts:91](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L91)

## Type Parameters

### State

`State` = `Record`\<`string`, `unknown`\>

## Properties

### dormantGraceMs?

> `optional` **dormantGraceMs?**: `number`

Defined in: [src/testing/harness.ts:103](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L103)

Dormancy grace window for the drift/overlay timers (default 3000ms).

***

### initialState?

> `optional` **initialState?**: `State`

Defined in: [src/testing/harness.ts:93](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L93)

The initial projected state (guards read it; enables the state tap).

***

### node?

> `optional` **node?**: `string`

Defined in: [src/testing/harness.ts:97](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L97)

Starting page (default: the graph's first page).

***

### onWarn?

> `optional` **onWarn?**: (`message`) => `void`

Defined in: [src/testing/harness.ts:105](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L105)

Sink for the session's dev warnings (default: collected, readable via warnings()).

#### Parameters

##### message

`string`

#### Returns

`void`

***

### redactedKeys?

> `optional` **redactedKeys?**: `string`[]

Defined in: [src/testing/harness.ts:101](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L101)

Keys stored redacted in the commit log.

***

### resolvers?

> `optional` **resolvers?**: `Record`\<`string`, [`Resolver`](/api/testing/type-aliases/Resolver)\<`State`\>\>

Defined in: [src/testing/harness.ts:95](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L95)

One mock handler per action, keyed by affordance id (qualified or bare/leaf).

***

### session?

> `optional` **session?**: [`InteractionSession`](/api/index/classes/InteractionSession)\<`string`\>

Defined in: [src/testing/harness.ts:111](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L111)

Bring your own already-wired session (real registerActions / taps) for
full integration fidelity. In this mode the harness does NOT auto-mount or
inject a clock — it wraps what you built. `graph`/`resolvers` are ignored.

***

### strict?

> `optional` **strict?**: `boolean`

Defined in: [src/testing/harness.ts:99](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L99)

Fail the test the instant declared-effect drift appears. Default false (report-by-default).
