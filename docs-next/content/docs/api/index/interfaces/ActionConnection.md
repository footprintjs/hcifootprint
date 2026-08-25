---
title: ActionConnection<F, Id, HasInputReader, Mode>
---

# Interface: ActionConnection\<F, Id, HasInputReader, Mode\>

Defined in: [src/action/types.ts:645](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L645)

## Type Parameters

### F

`F` *extends* (...`args`) => `any` = (...`args`) => `any`

### Id

`Id` *extends* `string` = `string`

### HasInputReader

`HasInputReader` *extends* `boolean` = `false`

### Mode

`Mode` *extends* [`ActionInvocationMode`](/api/index/type-aliases/ActionInvocationMode) = [`ActionInvocationMode`](/api/index/type-aliases/ActionInvocationMode)

## Properties

### binding

> `readonly` **binding**: [`ActionBindingRef`](/api/index/interfaces/ActionBindingRef)\<`Id`\>

Defined in: [src/action/types.ts:652](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L652)

***

### definition

> `readonly` **definition**: [`ActionDefinitionRef`](/api/index/interfaces/ActionDefinitionRef)\<`Id`\>

Defined in: [src/action/types.ts:651](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L651)

***

### invoke

> `readonly` **invoke**: [`ActionInvoke`](/api/index/type-aliases/ActionInvoke)\<`F`, `Id`, `HasInputReader`, `Mode`\>

Defined in: [src/action/types.ts:670](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L670)

## Methods

### attach()

> **attach**(`projection`): [`ActionAttachment`](/api/index/interfaces/ActionAttachment)

Defined in: [src/action/types.ts:653](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L653)

#### Parameters

##### projection

[`BindingProjection`](/api/index/interfaces/BindingProjection)

#### Returns

[`ActionAttachment`](/api/index/interfaces/ActionAttachment)

***

### disconnect()

> **disconnect**(): `void`

Defined in: [src/action/types.ts:683](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L683)

#### Returns

`void`

***

### invokeContinuation()

> **invokeContinuation**\<`HostResult`\>(`continuation`): [`ActionInvocation`](/api/index/interfaces/ActionInvocation)\<`Awaited`\<`HostResult`\>, `Id`, `"host-continuation"`\>

Defined in: [src/action/types.ts:676](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L676)

Open an invocation around a host listener continuation. The definition's
implementation is not also called: the continuation is this occurrence's
exact application behavior, so listener composition remains one act.

#### Type Parameters

##### HostResult

`HostResult`

#### Parameters

##### continuation

() => `HostResult`

#### Returns

[`ActionInvocation`](/api/index/interfaces/ActionInvocation)\<`Awaited`\<`HostResult`\>, `Id`, `"host-continuation"`\>

***

### settle()

> **settle**(`transition`, `settlement`): [`ActionEffectSettlement`](/api/index/type-aliases/ActionEffectSettlement)\<`Id`\>

Defined in: [src/action/types.ts:679](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L679)

#### Parameters

##### transition

[`ActionTransitionRef`](/api/index/interfaces/ActionTransitionRef)\<`Id`\>

##### settlement

[`ActionEffectSettlementInput`](/api/index/type-aliases/ActionEffectSettlementInput)

#### Returns

[`ActionEffectSettlement`](/api/index/type-aliases/ActionEffectSettlement)\<`Id`\>

***

### touch()

> **touch**(): `void`

Defined in: [src/action/types.ts:669](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L669)

Publish a new committed fact generation when stable readers changed meaning.

#### Returns

`void`

***

### update()

> **update**\<`Update`\>(`update`): `void`

Defined in: [src/action/types.ts:654](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L654)

#### Type Parameters

##### Update

`Update` *extends* [`ActionBindingUpdate`](/api/index/interfaces/ActionBindingUpdate)\<`Parameters`\<`F`\> *extends* \[\] ? `undefined` : `Parameters`\<`F`\>\[`0`\]\>

#### Parameters

##### update

`Update` & `HasInputReader` *extends* `true` ? `Update` *extends* `object` ? `never` : `unknown` : `"input"` *extends* keyof `Update` ? `never` : `unknown`

#### Returns

`void`
