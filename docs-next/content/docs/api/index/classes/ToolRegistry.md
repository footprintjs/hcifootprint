---
title: ToolRegistry
---

# Class: ToolRegistry

Defined in: [src/registry/registry.ts:36](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L36)

## Constructors

### Constructor

> **new ToolRegistry**(`warn?`): `ToolRegistry`

Defined in: [src/registry/registry.ts:40](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L40)

#### Parameters

##### warn?

(`message`) => `void`

#### Returns

`ToolRegistry`

## Methods

### handlerFor()

> **handlerFor**(`affordanceId`): [`ToolHandler`](/api/index/type-aliases/ToolHandler) \| `undefined`

Defined in: [src/registry/registry.ts:85](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L85)

#### Parameters

##### affordanceId

`string`

#### Returns

[`ToolHandler`](/api/index/type-aliases/ToolHandler) \| `undefined`

***

### hasAny()

> **hasAny**(): `boolean`

Defined in: [src/registry/registry.ts:94](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L94)

True when anything is registered — the signal that materialization is meaningful.

#### Returns

`boolean`

***

### isEnabled()

> **isEnabled**(`affordanceId`): `boolean` \| `undefined`

Defined in: [src/registry/registry.ts:69](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L69)

Whether a registered tool is currently clickable. Undefined if not registered.

#### Parameters

##### affordanceId

`string`

#### Returns

`boolean` \| `undefined`

***

### isRegistered()

> **isRegistered**(`affordanceId`): `boolean`

Defined in: [src/registry/registry.ts:89](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L89)

#### Parameters

##### affordanceId

`string`

#### Returns

`boolean`

***

### register()

> **register**(`group`, `affordanceId`, `handler`, `enabled?`): `void`

Defined in: [src/registry/registry.ts:44](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L44)

#### Parameters

##### group

`string`

##### affordanceId

`string`

##### handler

[`ToolHandler`](/api/index/type-aliases/ToolHandler)

##### enabled?

`boolean` = `true`

#### Returns

`void`

***

### registrations()

> **registrations**(): [`Registration`](/api/index/interfaces/Registration)[]

Defined in: [src/registry/registry.ts:98](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L98)

#### Returns

[`Registration`](/api/index/interfaces/Registration)[]

***

### setEnabled()

> **setEnabled**(`affordanceId`, `enabled`): `boolean`

Defined in: [src/registry/registry.ts:61](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L61)

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

Defined in: [src/registry/registry.ts:74](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L74)

Remove every registration currently owned by `group`. Returns the removed ids.

#### Parameters

##### group

`string`

#### Returns

`string`[]
