---
title: ActionGroupHandle
---

# Interface: ActionGroupHandle

Defined in: [src/traverse/nav-session.ts:142](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L142)

The handle returned by registerActions — the group's IDENTITY (see
ActionGroup). Hold it and call `unregister()` on unmount; `setEnabled(id, …)`
greys one action out.

## Extends

- [`ActionGroup`](/api/index/interfaces/ActionGroup)

## Properties

### id

> `readonly` **id**: `string`

Defined in: [src/atom/types.ts:1186](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1186)

Generated identity of this registration (for telemetry/debug — not caller-supplied).

#### Inherited from

[`ActionGroup`](/api/index/interfaces/ActionGroup).[`id`](/api/index/interfaces/ActionGroup#id)

***

### instance?

> `readonly` `optional` **instance?**: `string`

Defined in: [src/traverse/nav-session.ts:144](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L144)

Instance key, when this group registered one card of a repeats container.

***

### node?

> `readonly` `optional` **node?**: `string`

Defined in: [src/atom/types.ts:1188](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1188)

The node path this group is registered on (tree API); undefined for the flat API.

#### Inherited from

[`ActionGroup`](/api/index/interfaces/ActionGroup).[`node`](/api/index/interfaces/ActionGroup#node)

## Methods

### setBusy()

> **setBusy**(`actionId`, `busy`): `void`

Defined in: [src/atom/types.ts:1200](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1200)

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

#### Inherited from

[`ActionGroup`](/api/index/interfaces/ActionGroup).[`setBusy`](/api/index/interfaces/ActionGroup#setbusy)

***

### setEnabled()

> **setEnabled**(`actionId`, `enabled`): `void`

Defined in: [src/atom/types.ts:1190](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1190)

Grey out / re-enable one action in this group (a disabled button).

#### Parameters

##### actionId

`string`

##### enabled

`boolean`

#### Returns

`void`

#### Inherited from

[`ActionGroup`](/api/index/interfaces/ActionGroup).[`setEnabled`](/api/index/interfaces/ActionGroup#setenabled)

***

### unregister()

> **unregister**(): `void`

Defined in: [src/atom/types.ts:1202](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1202)

Remove this group's registrations (call on unmount). Idempotent.

#### Returns

`void`

#### Inherited from

[`ActionGroup`](/api/index/interfaces/ActionGroup).[`unregister`](/api/index/interfaces/ActionGroup#unregister)
