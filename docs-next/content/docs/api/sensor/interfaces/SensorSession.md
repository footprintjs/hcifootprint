---
title: SensorSession
---

# Interface: SensorSession

Defined in: src/sensor/types.ts:51

What the sensor needs from a session — and nothing more.

A real `InteractionSession` satisfies it structurally (proved in
test/sensor-boundary.test.ts by assigning one to this type), so a consumer
passes their session straight in; a test can pass a hand-built stand-in.

## Methods

### available()

> **available**(): [`AvailableSlice`](/api/index/interfaces/AvailableSlice)

Defined in: src/sensor/types.ts:53

The live action space: the served edges ARE the sensor's watch-list.

#### Returns

[`AvailableSlice`](/api/index/interfaces/AvailableSlice)

***

### fire()

> **fire**(`affordanceId`, `opts`): [`FireResult`](/api/index/type-aliases/FireResult)

Defined in: src/sensor/types.ts:58

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

Defined in: src/sensor/types.ts:60

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

Defined in: src/sensor/types.ts:62

Observed navigation: the existing hop-recording path (atom/types.ts:438-442).

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
