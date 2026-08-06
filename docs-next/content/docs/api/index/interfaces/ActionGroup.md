---
title: ActionGroup
---

# Interface: ActionGroup

Defined in: [src/atom/types.ts:1179](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1179)

The handle returned by registerActions — the group's IDENTITY. You never
name a group with a string (two components would collide and you'd have to
invent unique names); registration hands you this handle and you act through
it. `id` is a generated opaque token, exposed only for telemetry/warnings.

## Extended by

- [`ActionGroupHandle`](/api/index/interfaces/ActionGroupHandle)

## Properties

### id

> `readonly` **id**: `string`

Defined in: [src/atom/types.ts:1181](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1181)

Generated identity of this registration (for telemetry/debug — not caller-supplied).

***

### node?

> `readonly` `optional` **node?**: `string`

Defined in: [src/atom/types.ts:1183](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1183)

The node path this group is registered on (tree API); undefined for the flat API.

## Methods

### setBusy()

> **setBusy**(`actionId`, `busy`): `void`

Defined in: [src/atom/types.ts:1195](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1195)

Say that one action in this group is WORKING RIGHT NOW, in your own words —
or hand `undefined` to stop saying it. See [AvailableEdge.busy](/api/index/interfaces/AvailableEdge#busy): the
label is yours, presence is the whole claim, and there is no boolean form.

Required, exactly like `setEnabled` beside it: this handle is MINTED by the
library and never implemented by a consumer, so every handle in existence
can say the third state rather than some of them.

#### Parameters

##### actionId

`string`

##### busy

`string` \| `undefined`

#### Returns

`void`

***

### setEnabled()

> **setEnabled**(`actionId`, `enabled`): `void`

Defined in: [src/atom/types.ts:1185](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1185)

Grey out / re-enable one action in this group (a disabled button).

#### Parameters

##### actionId

`string`

##### enabled

`boolean`

#### Returns

`void`

***

### unregister()

> **unregister**(): `void`

Defined in: [src/atom/types.ts:1197](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1197)

Remove this group's registrations (call on unmount). Idempotent.

#### Returns

`void`
