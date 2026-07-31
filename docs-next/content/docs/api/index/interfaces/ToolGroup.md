---
title: ToolGroup
---

# Interface: ToolGroup

Defined in: [src/atom/types.ts:515](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L515)

The handle returned by registerToolGroup — the group's IDENTITY. You never
name a group with a string (two components would collide and you'd have to
invent unique names); registration hands you this handle and you act through
it. `id` is a generated opaque token, exposed only for telemetry/warnings.

## Extended by

- [`ToolGroupHandle`](/api/index/interfaces/ToolGroupHandle)

## Properties

### id

> `readonly` **id**: `string`

Defined in: [src/atom/types.ts:517](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L517)

Generated identity of this registration (for telemetry/debug — not caller-supplied).

***

### node?

> `readonly` `optional` **node?**: `string`

Defined in: [src/atom/types.ts:519](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L519)

The node path this group is registered on (tree API); undefined for the flat API.

## Methods

### setBusy()

> **setBusy**(`toolId`, `busy`): `void`

Defined in: [src/atom/types.ts:531](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L531)

Say that one tool in this group is WORKING RIGHT NOW, in your own words —
or hand `undefined` to stop saying it. See [AvailableEdge.busy](/api/index/interfaces/AvailableEdge#busy): the
label is yours, presence is the whole claim, and there is no boolean form.

Required, exactly like `setEnabled` beside it: this handle is MINTED by the
library and never implemented by a consumer, so every handle in existence
can say the third state rather than some of them.

#### Parameters

##### toolId

`string`

##### busy

`string` \| `undefined`

#### Returns

`void`

***

### setEnabled()

> **setEnabled**(`toolId`, `enabled`): `void`

Defined in: [src/atom/types.ts:521](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L521)

Grey out / re-enable one tool in this group (a disabled button).

#### Parameters

##### toolId

`string`

##### enabled

`boolean`

#### Returns

`void`

***

### unregister()

> **unregister**(): `void`

Defined in: [src/atom/types.ts:533](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L533)

Remove this group's registrations (call on unmount). Idempotent.

#### Returns

`void`
