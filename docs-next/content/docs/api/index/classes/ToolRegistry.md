---
title: ToolRegistry
---

# Class: ToolRegistry

Defined in: [src/registry/registry.ts:42](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L42)

## Constructors

### Constructor

> **new ToolRegistry**(`warn?`): `ToolRegistry`

Defined in: [src/registry/registry.ts:46](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L46)

#### Parameters

##### warn?

(`message`) => `void`

#### Returns

`ToolRegistry`

## Methods

### busyOf()

> **busyOf**(`affordanceId`): `string` \| `undefined`

Defined in: [src/registry/registry.ts:109](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L109)

The app's own busy label for a registered tool, or undefined if it has not said.

#### Parameters

##### affordanceId

`string`

#### Returns

`string` \| `undefined`

***

### handlerFor()

> **handlerFor**(`affordanceId`): [`ToolHandler`](/api/index/type-aliases/ToolHandler) \| `undefined`

Defined in: [src/registry/registry.ts:125](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L125)

#### Parameters

##### affordanceId

`string`

#### Returns

[`ToolHandler`](/api/index/type-aliases/ToolHandler) \| `undefined`

***

### hasAny()

> **hasAny**(): `boolean`

Defined in: [src/registry/registry.ts:134](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L134)

True when anything is registered — the signal that materialization is meaningful.

#### Returns

`boolean`

***

### isEnabled()

> **isEnabled**(`affordanceId`): `boolean` \| `undefined`

Defined in: [src/registry/registry.ts:104](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L104)

Whether a registered tool is currently clickable. Undefined if not registered.

#### Parameters

##### affordanceId

`string`

#### Returns

`boolean` \| `undefined`

***

### isRegistered()

> **isRegistered**(`affordanceId`): `boolean`

Defined in: [src/registry/registry.ts:129](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L129)

#### Parameters

##### affordanceId

`string`

#### Returns

`boolean`

***

### register()

> **register**(`group`, `affordanceId`, `handler`, `enabled?`, `busy?`): `void`

Defined in: [src/registry/registry.ts:50](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L50)

#### Parameters

##### group

`string`

##### affordanceId

`string`

##### handler

[`ToolHandler`](/api/index/type-aliases/ToolHandler)

##### enabled?

`boolean` = `true`

##### busy?

`string`

#### Returns

`void`

***

### registrations()

> **registrations**(): [`Registration`](/api/index/interfaces/Registration)[]

Defined in: [src/registry/registry.ts:138](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L138)

#### Returns

[`Registration`](/api/index/interfaces/Registration)[]

***

### setBusy()

> **setBusy**(`affordanceId`, `busy`): `boolean`

Defined in: [src/registry/registry.ts:95](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L95)

Say (or stop saying) that a registered tool is working right now. Same
contract as setEnabled: true only on a real change, so the caller bumps the
world exactly once. `undefined` DELETES the key rather than storing one —
absence is how this library spells "the app has not said".

#### Parameters

##### affordanceId

`string`

##### busy

`string` \| `undefined`

#### Returns

`boolean`

***

### setEnabled()

> **setEnabled**(`affordanceId`, `enabled`): `boolean`

Defined in: [src/registry/registry.ts:82](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L82)

Flip a registered tool between clickable and greyed-out. Returns true if
the state actually changed (so the caller can bump the version / emit only
on a real change). No-op + false if the id isn't registered.

#### Parameters

##### affordanceId

`string`

##### enabled

`boolean`

#### Returns

`boolean`

***

### unregisterGroup()

> **unregisterGroup**(`group`): `string`[]

Defined in: [src/registry/registry.ts:114](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L114)

Remove every registration currently owned by `group`. Returns the removed ids.

#### Parameters

##### group

`string`

#### Returns

`string`[]
