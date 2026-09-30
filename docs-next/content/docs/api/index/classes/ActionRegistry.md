---
title: ActionRegistry
---

# Class: ActionRegistry

Defined in: [src/registry/registry.ts:125](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L125)

## Constructors

### Constructor

> **new ActionRegistry**(`warn?`): `ActionRegistry`

Defined in: [src/registry/registry.ts:135](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L135)

#### Parameters

##### warn?

(`message`) => `void`

#### Returns

`ActionRegistry`

## Methods

### bindingRegistrations()

> **bindingRegistrations**(): [`BindingRegistration`](/api/index/interfaces/BindingRegistration)[]

Defined in: [src/registry/registry.ts:316](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L316)

Every structured live binding, without the legacy compatibility rows.

#### Returns

[`BindingRegistration`](/api/index/interfaces/BindingRegistration)[]

***

### bindingsFor()

> **bindingsFor**(`definition`): [`BindingRegistration`](/api/index/interfaces/BindingRegistration)[]

Defined in: [src/registry/registry.ts:343](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L343)

Every live binding of one definition, in connection order.

#### Parameters

##### definition

[`ActionDefinitionRef`](/api/index/interfaces/ActionDefinitionRef)

#### Returns

[`BindingRegistration`](/api/index/interfaces/BindingRegistration)[]

***

### busyOf()

> **busyOf**(`affordanceId`): `string` \| `undefined`

Defined in: [src/registry/registry.ts:274](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L274)

The app's own busy label for a registered tool, or undefined if it has not said.

#### Parameters

##### affordanceId

`string`

#### Returns

`string` \| `undefined`

***

### handlerFor()

> **handlerFor**(`affordanceId`): [`ActionHandler`](/api/index/type-aliases/ActionHandler) \| `undefined`

Defined in: [src/registry/registry.ts:296](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L296)

#### Parameters

##### affordanceId

`string`

#### Returns

[`ActionHandler`](/api/index/type-aliases/ActionHandler) \| `undefined`

***

### handlerForBinding()

> **handlerForBinding**(`binding`): [`ActionHandler`](/api/index/type-aliases/ActionHandler) \| `undefined`

Defined in: [src/registry/registry.ts:330](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L330)

Resolve the handler for one exact structured binding.

#### Parameters

##### binding

[`ActionBindingRef`](/api/index/interfaces/ActionBindingRef)

#### Returns

[`ActionHandler`](/api/index/type-aliases/ActionHandler) \| `undefined`

***

### hasAny()

> **hasAny**(): `boolean`

Defined in: [src/registry/registry.ts:305](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L305)

True when anything is registered — the signal that materialization is meaningful.

#### Returns

`boolean`

***

### isEnabled()

> **isEnabled**(`affordanceId`): `boolean` \| `undefined`

Defined in: [src/registry/registry.ts:269](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L269)

Whether a registered tool is currently clickable. Undefined if not registered.

#### Parameters

##### affordanceId

`string`

#### Returns

`boolean` \| `undefined`

***

### isRegistered()

> **isRegistered**(`affordanceId`): `boolean`

Defined in: [src/registry/registry.ts:300](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L300)

#### Parameters

##### affordanceId

`string`

#### Returns

`boolean`

***

### register()

> **register**(`group`, `affordanceId`, `handler`, `enabled?`, `busy?`): `void`

Defined in: [src/registry/registry.ts:139](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L139)

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

Defined in: [src/registry/registry.ts:183](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L183)

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

###### attached?

`boolean`

###### coverage?

[`BindingCoverage`](/api/index/type-aliases/BindingCoverage)

###### humanReporting?

[`HumanReporting`](/api/index/type-aliases/HumanReporting)

###### input?

() => `unknown`

###### locators?

readonly [`Binding`](/api/index/type-aliases/Binding)[]

###### readBusy?

() => `string` \| `undefined`

###### readEnabled?

() => `boolean` \| `undefined`

#### Returns

`void`

***

### registrationFor()

> **registrationFor**(`binding`): [`BindingRegistration`](/api/index/interfaces/BindingRegistration) \| `undefined`

Defined in: [src/registry/registry.ts:335](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L335)

A copy of one exact structured registration, or nothing once disconnected.

#### Parameters

##### binding

[`ActionBindingRef`](/api/index/interfaces/ActionBindingRef)

#### Returns

[`BindingRegistration`](/api/index/interfaces/BindingRegistration) \| `undefined`

***

### registrations()

> **registrations**(): [`Registration`](/api/index/interfaces/Registration)[]

Defined in: [src/registry/registry.ts:309](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L309)

#### Returns

[`Registration`](/api/index/interfaces/Registration)[]

***

### setBindingBusy()

> **setBindingBusy**(`binding`, `busy`): `boolean`

Defined in: [src/registry/registry.ts:371](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L371)

Set or clear the busy label on one binding without changing any sibling.

#### Parameters

##### binding

[`ActionBindingRef`](/api/index/interfaces/ActionBindingRef)

##### busy

`string` \| `undefined`

#### Returns

`boolean`

***

### setBindingEnabled()

> **setBindingEnabled**(`binding`, `enabled`): `boolean`

Defined in: [src/registry/registry.ts:362](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L362)

Flip enabledness on one binding without changing any sibling.

#### Parameters

##### binding

[`ActionBindingRef`](/api/index/interfaces/ActionBindingRef)

##### enabled

`boolean`

#### Returns

`boolean`

***

### setBusy()

> **setBusy**(`affordanceId`, `busy`): `boolean`

Defined in: [src/registry/registry.ts:259](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L259)

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

Defined in: [src/registry/registry.ts:245](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L245)

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

Defined in: [src/registry/registry.ts:439](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L439)

Mark an attachment-host replacement whose public facts are otherwise equal.

#### Parameters

##### binding

[`ActionBindingRef`](/api/index/interfaces/ActionBindingRef)

#### Returns

`boolean`

***

### unregisterBinding()

> **unregisterBinding**(`binding`): `boolean`

Defined in: [src/registry/registry.ts:447](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L447)

Disconnect one exact binding. Idempotent.

#### Parameters

##### binding

[`ActionBindingRef`](/api/index/interfaces/ActionBindingRef)

#### Returns

`boolean`

***

### unregisterGroup()

> **unregisterGroup**(`group`): `string`[]

Defined in: [src/registry/registry.ts:279](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L279)

Remove every registration currently owned by `group`. Returns the removed ids.

#### Parameters

##### group

`string`

#### Returns

`string`[]

***

### updateBinding()

> **updateBinding**(`binding`, `update`): `boolean`

Defined in: [src/registry/registry.ts:381](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L381)

Replace committed facts for one stable binding identity.

#### Parameters

##### binding

[`ActionBindingRef`](/api/index/interfaces/ActionBindingRef)

##### update

###### attached?

`boolean`

###### coverage?

[`BindingCoverage`](/api/index/type-aliases/BindingCoverage)

###### humanReporting?

[`HumanReporting`](/api/index/type-aliases/HumanReporting)

###### input?

() => `unknown`

###### locators?

readonly [`Binding`](/api/index/type-aliases/Binding)[]

###### readBusy?

() => `string` \| `undefined`

###### readEnabled?

() => `boolean` \| `undefined`

#### Returns

`boolean`
