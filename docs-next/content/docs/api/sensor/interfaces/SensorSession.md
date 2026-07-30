---
title: SensorSession
---

# Interface: SensorSession

Defined in: [src/sensor/types.ts:55](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L55)

What the sensor needs from a session — and nothing more.

A real `InteractionSession` satisfies it structurally (proved in
test/sensor-boundary.test.ts by assigning one to this type), so a consumer
passes their session straight in; a test can pass a hand-built stand-in.

## Methods

### available()

> **available**(): [`AvailableSlice`](/api/index/interfaces/AvailableSlice)

Defined in: [src/sensor/types.ts:57](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L57)

The live action space: the served edges ARE the sensor's watch-list.

#### Returns

[`AvailableSlice`](/api/index/interfaces/AvailableSlice)

***

### declareHolds()?

> `optional` **declareHolds**(`affordanceId`, `read`): () => `void`

Defined in: [src/sensor/types.ts:81](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L81)

The session's value door: hand over a declared control's `value()` so the
SERVED ROW can say what the control holds, one turn before anything fires.

The coupling runs one way, sensor → session, and only for the getter the app
already handed over. Nothing about the sensor crosses: no element, no
instance, no report kind — so the session imports nothing from here and this
subpath stays the zero-value-import leaf it is.

Optional and severable, like `LiveBindingPort`'s two hooks: a hand-built port
without it keeps exactly today's behaviour (the getter still answers for the
payload of a reported gesture, and the row simply stays silent). A real
`InteractionSession` satisfies it as-is.

#### Parameters

##### affordanceId

`string`

##### read

() => `unknown`

#### Returns

() => `void`

***

### fire()

> **fire**(`affordanceId`, `opts`): [`FireResult`](/api/index/type-aliases/FireResult)

Defined in: [src/sensor/types.ts:62](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L62)

The record-only tier — and the port DEMANDS it, so the sensor is
structurally incapable of executing anything. See [RecordOnlyFire](/api/sensor/type-aliases/RecordOnlyFire).

#### Parameters

##### affordanceId

`string`

##### opts

[`RecordOnlyFire`](/api/sensor/type-aliases/RecordOnlyFire)

#### Returns

[`FireResult`](/api/index/type-aliases/FireResult)

***

### on()

> **on**\<`N`\>(`event`, `listener`): () => `void`

Defined in: [src/sensor/types.ts:64](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L64)

The passive observer surface — how the sensor learns the surface moved.

#### Type Parameters

##### N

`N` *extends* keyof [`SessionEvents`](/api/index/interfaces/SessionEvents)

#### Parameters

##### event

`N`

##### listener

(`payload`) => `void`

#### Returns

() => `void`

***

### sync()

> **sync**(`observedNode`, `opts?`): [`SyncResult`](/api/index/type-aliases/SyncResult)

Defined in: [src/sensor/types.ts:66](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L66)

Observed navigation: the existing hop-recording path (atom/types.ts:495 `unverifiedEdge`).

#### Parameters

##### observedNode

`string`

##### opts?

###### principal?

[`Principal`](/api/index/type-aliases/Principal)

###### stimulus?

[`StimulusKind`](/api/index/type-aliases/StimulusKind)

#### Returns

[`SyncResult`](/api/index/type-aliases/SyncResult)
