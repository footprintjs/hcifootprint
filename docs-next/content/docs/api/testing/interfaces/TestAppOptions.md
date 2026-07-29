---
title: TestAppOptions<State>
---

# Interface: TestAppOptions\<State\>

Defined in: [src/testing/harness.ts:90](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L90)

## Type Parameters

### State

`State`

## Properties

### dormantGraceMs?

> `optional` **dormantGraceMs?**: `number`

Defined in: [src/testing/harness.ts:102](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L102)

Dormancy grace window for the drift/overlay timers (default 3000ms).

***

### initialState?

> `optional` **initialState?**: `State`

Defined in: [src/testing/harness.ts:92](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L92)

The initial projected state (guards read it; enables the state tap).

***

### node?

> `optional` **node?**: `string`

Defined in: [src/testing/harness.ts:96](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L96)

Starting page (default: the graph's first page).

***

### onWarn?

> `optional` **onWarn?**: (`message`) => `void`

Defined in: [src/testing/harness.ts:104](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L104)

Sink for the session's dev warnings (default: collected, readable via warnings()).

#### Parameters

##### message

`string`

#### Returns

`void`

***

### redactedKeys?

> `optional` **redactedKeys?**: `string`[]

Defined in: [src/testing/harness.ts:100](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L100)

Keys stored redacted in the commit log.

***

### resolvers?

> `optional` **resolvers?**: `Record`\<`string`, [`Resolver`](/api/testing/type-aliases/Resolver)\<`State`\>\>

Defined in: [src/testing/harness.ts:94](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L94)

One mock handler per action, keyed by affordance id (qualified or bare/leaf).

***

### session?

> `optional` **session?**: [`InteractionSession`](/api/index/classes/InteractionSession)\<`string`\>

Defined in: [src/testing/harness.ts:110](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L110)

Bring your own already-wired session (real registerToolGroup / taps) for
full integration fidelity. In this mode the harness does NOT auto-mount or
inject a clock — it wraps what you built. `graph`/`resolvers` are ignored.

***

### strict?

> `optional` **strict?**: `boolean`

Defined in: [src/testing/harness.ts:98](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L98)

Fail the test the instant declared-effect drift appears. Default false (report-by-default).
