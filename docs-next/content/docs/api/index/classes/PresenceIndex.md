---
title: PresenceIndex
---

# Class: PresenceIndex

Defined in: [src/presence/presence.ts:30](https://github.com/footprintjs/hcifootprint/blob/main/src/presence/presence.ts#L30)

## Constructors

### Constructor

> **new PresenceIndex**(): `PresenceIndex`

#### Returns

`PresenceIndex`

## Methods

### fingerprint()

> **fingerprint**(): `string`

Defined in: [src/presence/presence.ts:131](https://github.com/footprintjs/hcifootprint/blob/main/src/presence/presence.ts#L131)

The served-structure identity used for coalesced world-motion detection:
node presence + visibility signals. Instance churn is EXCLUDED by design.

#### Returns

`string`

***

### hasAny()

> **hasAny**(): `boolean`

Defined in: [src/presence/presence.ts:114](https://github.com/footprintjs/hcifootprint/blob/main/src/presence/presence.ts#L114)

True when ANY handle (node OR instance) is open — "the mount layer is in use".

#### Returns

`boolean`

***

### hasAnyHandles()

> **hasAnyHandles**(): `boolean`

Defined in: [src/presence/presence.ts:109](https://github.com/footprintjs/hcifootprint/blob/main/src/presence/presence.ts#L109)

True when ANY node handle is open — the signal that presence is in use at all.

#### Returns

`boolean`

***

### hasInstance()

> **hasInstance**(`node`, `instance`): `boolean`

Defined in: [src/presence/presence.ts:104](https://github.com/footprintjs/hcifootprint/blob/main/src/presence/presence.ts#L104)

#### Parameters

##### node

`string`

##### instance

`string`

#### Returns

`boolean`

***

### instancesOf()

> **instancesOf**(`node`): `string`[]

Defined in: [src/presence/presence.ts:100](https://github.com/footprintjs/hcifootprint/blob/main/src/presence/presence.ts#L100)

Mounted instance keys of a repeats node (the mounted WINDOW, not existence).

#### Parameters

##### node

`string`

#### Returns

`string`[]

***

### isPresent()

> **isPresent**(`node`): `boolean`

Defined in: [src/presence/presence.ts:91](https://github.com/footprintjs/hcifootprint/blob/main/src/presence/presence.ts#L91)

A node is present when at least one NODE handle is open on it.

#### Parameters

##### node

`string`

#### Returns

`boolean`

***

### open()

> **open**(`node`, `instance?`): [`PresenceHandle`](/api/index/interfaces/PresenceHandle)

Defined in: [src/presence/presence.ts:41](https://github.com/footprintjs/hcifootprint/blob/main/src/presence/presence.ts#L41)

#### Parameters

##### node

`string`

##### instance?

`string`

#### Returns

[`PresenceHandle`](/api/index/interfaces/PresenceHandle)

***

### presentNodes()

> **presentNodes**(): `string`[]

Defined in: [src/presence/presence.ts:95](https://github.com/footprintjs/hcifootprint/blob/main/src/presence/presence.ts#L95)

#### Returns

`string`[]

***

### setVisible()

> **setVisible**(`node`, `visible`): `void`

Defined in: [src/presence/presence.ts:118](https://github.com/footprintjs/hcifootprint/blob/main/src/presence/presence.ts#L118)

#### Parameters

##### node

`string`

##### visible

`boolean`

#### Returns

`void`

***

### visibility()

> **visibility**(`node`): `boolean` \| `undefined`

Defined in: [src/presence/presence.ts:123](https://github.com/footprintjs/hcifootprint/blob/main/src/presence/presence.ts#L123)

The explicit signal, or undefined when none was ever given (→ honesty markers above).

#### Parameters

##### node

`string`

#### Returns

`boolean` \| `undefined`
