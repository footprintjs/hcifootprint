---
title: ActionRegistry
---

# Class: ActionRegistry

Defined in: [src/registry/registry.ts:112](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L112)

## Constructors

### Constructor

> **new ActionRegistry**(`warn?`): `ActionRegistry`

Defined in: [src/registry/registry.ts:122](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L122)

#### Parameters

##### warn?

(`message`) => `void`

#### Returns

`ActionRegistry`

## Methods

### bindingRegistrations()

> **bindingRegistrations**(): [`BindingRegistration`](/api/index/interfaces/BindingRegistration)[]

Defined in: [src/registry/registry.ts:301](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L301)

Every structured live binding, without the legacy compatibility rows.

#### Returns

[`BindingRegistration`](/api/index/interfaces/BindingRegistration)[]

***

### bindingsFor()

> **bindingsFor**(`definitionId`): [`BindingRegistration`](/api/index/interfaces/BindingRegistration)[]

Defined in: [src/registry/registry.ts:332](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L332)

Every live binding of one definition, in connection order.

#### Parameters

##### definitionId

`string`

#### Returns

[`BindingRegistration`](/api/index/interfaces/BindingRegistration)[]

***

### busyOf()

> **busyOf**(`affordanceId`): `string` \| `undefined`

Defined in: [src/registry/registry.ts:259](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L259)

The app's own busy label for a registered tool, or undefined if it has not said.

#### Parameters

##### affordanceId

`string`

#### Returns

`string` \| `undefined`

***

### handlerFor()

> **handlerFor**(`affordanceId`): [`ActionHandler`](/api/index/type-aliases/ActionHandler) \| `undefined`

Defined in: [src/registry/registry.ts:281](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L281)

#### Parameters

##### affordanceId

`string`

#### Returns

[`ActionHandler`](/api/index/type-aliases/ActionHandler) \| `undefined`

***

### handlerForBinding()

> **handlerForBinding**(`binding`): [`ActionHandler`](/api/index/type-aliases/ActionHandler) \| `undefined`

Defined in: [src/registry/registry.ts:315](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L315)

Resolve the handler for one exact structured binding.

#### Parameters

##### binding

`string` \| [`ActionBindingRef`](/api/index/interfaces/ActionBindingRef)\<`string`\>

#### Returns

[`ActionHandler`](/api/index/type-aliases/ActionHandler) \| `undefined`

***

### hasAny()

> **hasAny**(): `boolean`

Defined in: [src/registry/registry.ts:290](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L290)

True when anything is registered — the signal that materialization is meaningful.

#### Returns

`boolean`

***

### isEnabled()

> **isEnabled**(`affordanceId`): `boolean` \| `undefined`

Defined in: [src/registry/registry.ts:254](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L254)

Whether a registered tool is currently clickable. Undefined if not registered.

#### Parameters

##### affordanceId

`string`

#### Returns

`boolean` \| `undefined`

***

### isRegistered()

> **isRegistered**(`affordanceId`): `boolean`

Defined in: [src/registry/registry.ts:285](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L285)

#### Parameters

##### affordanceId

`string`

#### Returns

`boolean`

***

### register()

> **register**(`group`, `affordanceId`, `handler`, `enabled?`, `busy?`): `void`

Defined in: [src/registry/registry.ts:126](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L126)

#### Parameters

##### group

`string`

##### affordanceId

`string`

##### handler

[`ActionHandler`](/api/index/type-aliases/ActionHandler)

##### enabled?

`boolean` = `true`

##### busy?

`string`

#### Returns

`void`

***

### registerBinding()

> **registerBinding**(`group`, `binding`, `handler`, `enabled?`, `busy?`, `options?`): `void`

Defined in: [src/registry/registry.ts:168](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L168)

Register one exact live binding. Unlike the compatibility door above, a
second binding of the same definition coexists and receives no duplicate
warning: one definition mounted in many rows is the intended shape.

#### Parameters

##### group

`string`

##### binding

[`ActionBindingRef`](/api/index/interfaces/ActionBindingRef)

##### handler

[`ActionHandler`](/api/index/type-aliases/ActionHandler)

##### enabled?

`boolean` = `true`

##### busy?

`string`

##### options?

[`BindingRegistrationOptions`](/api/index/interfaces/BindingRegistrationOptions) = `{}`

#### Returns

`void`

***

### registrationFor()

> **registrationFor**(`binding`): [`BindingRegistration`](/api/index/interfaces/BindingRegistration) \| `undefined`

Defined in: [src/registry/registry.ts:322](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L322)

A copy of one exact structured registration, or nothing once disconnected.

#### Parameters

##### binding

`string` \| [`ActionBindingRef`](/api/index/interfaces/ActionBindingRef)\<`string`\>

#### Returns

[`BindingRegistration`](/api/index/interfaces/BindingRegistration) \| `undefined`

***

### registrations()

> **registrations**(): [`Registration`](/api/index/interfaces/Registration)[]

Defined in: [src/registry/registry.ts:294](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L294)

#### Returns

[`Registration`](/api/index/interfaces/Registration)[]

***

### setBindingBusy()

> **setBindingBusy**(`binding`, `busy`): `boolean`

Defined in: [src/registry/registry.ts:363](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L363)

Set or clear the busy label on one binding without changing any sibling.

#### Parameters

##### binding

`string` \| [`ActionBindingRef`](/api/index/interfaces/ActionBindingRef)\<`string`\>

##### busy

`string` \| `undefined`

#### Returns

`boolean`

***

### setBindingEnabled()

> **setBindingEnabled**(`binding`, `enabled`): `boolean`

Defined in: [src/registry/registry.ts:351](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L351)

Flip enabledness on one binding without changing any sibling.

#### Parameters

##### binding

`string` \| [`ActionBindingRef`](/api/index/interfaces/ActionBindingRef)\<`string`\>

##### enabled

`boolean`

#### Returns

`boolean`

***

### setBusy()

> **setBusy**(`affordanceId`, `busy`): `boolean`

Defined in: [src/registry/registry.ts:244](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L244)

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

Defined in: [src/registry/registry.ts:230](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L230)

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

### touchBinding()

> **touchBinding**(`binding`): `boolean`

Defined in: [src/registry/registry.ts:431](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L431)

Mark an attachment-host replacement whose public facts are otherwise equal.

#### Parameters

##### binding

`string` \| [`ActionBindingRef`](/api/index/interfaces/ActionBindingRef)\<`string`\>

#### Returns

`boolean`

***

### unregisterBinding()

> **unregisterBinding**(`binding`): `boolean`

Defined in: [src/registry/registry.ts:439](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L439)

Disconnect one exact binding. Idempotent.

#### Parameters

##### binding

`string` \| [`ActionBindingRef`](/api/index/interfaces/ActionBindingRef)\<`string`\>

#### Returns

`boolean`

***

### unregisterGroup()

> **unregisterGroup**(`group`): `string`[]

Defined in: [src/registry/registry.ts:264](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L264)

Remove every registration currently owned by `group`. Returns the removed ids.

#### Parameters

##### group

`string`

#### Returns

`string`[]

***

### updateBinding()

> **updateBinding**(`binding`, `update`): `boolean`

Defined in: [src/registry/registry.ts:376](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L376)

Replace committed facts for one stable binding identity.

#### Parameters

##### binding

`string` \| [`ActionBindingRef`](/api/index/interfaces/ActionBindingRef)\<`string`\>

##### update

[`BindingRegistrationOptions`](/api/index/interfaces/BindingRegistrationOptions)

#### Returns

`boolean`
