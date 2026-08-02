---
title: ActionGroup
---

# Interface: ActionGroup

Defined in: [src/atom/types.ts:520](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L520)

The handle returned by registerActions — the group's IDENTITY. You never
name a group with a string (two components would collide and you'd have to
invent unique names); registration hands you this handle and you act through
it. `id` is a generated opaque token, exposed only for telemetry/warnings.

## Extended by

- [`ActionGroupHandle`](/api/index/interfaces/ActionGroupHandle)

## Properties

### id

> `readonly` **id**: `string`

Defined in: [src/atom/types.ts:522](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L522)

Generated identity of this registration (for telemetry/debug — not caller-supplied).

***

### node?

> `readonly` `optional` **node?**: `string`

Defined in: [src/atom/types.ts:524](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L524)

The node path this group is registered on (tree API); undefined for the flat API.

## Methods

### setBusy()

> **setBusy**(`actionId`, `busy`): `void`

Defined in: [src/atom/types.ts:536](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L536)

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

Defined in: [src/atom/types.ts:526](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L526)

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

Defined in: [src/atom/types.ts:538](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L538)

Remove this group's registrations (call on unmount). Idempotent.

#### Returns

`void`
