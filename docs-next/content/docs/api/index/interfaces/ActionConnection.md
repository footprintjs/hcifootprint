---
title: ActionConnection<F, Id, HasInputReader>
---

# Interface: ActionConnection\<F, Id, HasInputReader\>

Defined in: src/action/types.ts:258

## Type Parameters

### F

`F` *extends* (...`args`) => `any` = (...`args`) => `any`

### Id

`Id` *extends* `string` = `string`

### HasInputReader

`HasInputReader` *extends* `boolean` = `false`

## Properties

### binding

> `readonly` **binding**: [`ActionBindingRef`](/api/index/interfaces/ActionBindingRef)\<`Id`\>

Defined in: src/action/types.ts:264

***

### definition

> `readonly` **definition**: [`ActionDefinitionRef`](/api/index/interfaces/ActionDefinitionRef)\<`Id`\>

Defined in: src/action/types.ts:263

***

### invoke

> `readonly` **invoke**: [`ActionInvoke`](/api/index/type-aliases/ActionInvoke)\<`F`, `Id`, `HasInputReader`\>

Defined in: src/action/types.ts:280

***

### invokeOffered

> `readonly` **invokeOffered**: [`ActionOfferedInvoke`](/api/index/type-aliases/ActionOfferedInvoke)\<`F`, `Id`, `HasInputReader`\>

Defined in: src/action/types.ts:282

Invoke under one exact previously exposed offer, without an argument-slot sentinel.

## Methods

### attach()

> **attach**(`projection`): [`ActionAttachment`](/api/index/interfaces/ActionAttachment)

Defined in: src/action/types.ts:265

#### Parameters

##### projection

[`BindingProjection`](/api/index/interfaces/BindingProjection)

#### Returns

[`ActionAttachment`](/api/index/interfaces/ActionAttachment)

***

### disconnect()

> **disconnect**(): `void`

Defined in: src/action/types.ts:295

#### Returns

`void`

***

### invokeContinuation()

> **invokeContinuation**(`continuation`): [`ActionInvocation`](/api/index/interfaces/ActionInvocation)\<`Awaited`\<`ReturnType`\<`F`\>\>, `Id`\>

Defined in: src/action/types.ts:288

Open an invocation around a host listener continuation. The definition's
implementation is not also called: the continuation is this occurrence's
exact application behavior, so listener composition remains one act.

#### Parameters

##### continuation

() => `ReturnType`\<`F`\>

#### Returns

[`ActionInvocation`](/api/index/interfaces/ActionInvocation)\<`Awaited`\<`ReturnType`\<`F`\>\>, `Id`\>

***

### settle()

> **settle**(`transition`, `settlement`): [`ActionEffectSettlement`](/api/index/type-aliases/ActionEffectSettlement)\<`Id`\>

Defined in: src/action/types.ts:291

#### Parameters

##### transition

[`ActionTransitionRef`](/api/index/interfaces/ActionTransitionRef)\<`Id`\>

##### settlement

[`ActionEffectSettlementInput`](/api/index/type-aliases/ActionEffectSettlementInput)

#### Returns

[`ActionEffectSettlement`](/api/index/type-aliases/ActionEffectSettlement)\<`Id`\>

***

### update()

> **update**(`update`): `void`

Defined in: src/action/types.ts:266

#### Parameters

##### update

`HasInputReader` *extends* `true` ? [`ActionBindingUpdate`](/api/index/interfaces/ActionBindingUpdate)\<`Parameters`\<`F`\> *extends* \[\] ? `undefined` : `Parameters`\<`F`\>\[`0`\]\> : `Omit`\<[`ActionBindingUpdate`](/api/index/interfaces/ActionBindingUpdate)\<`Parameters`\<`F`\> *extends* \[\] ? `undefined` : `Parameters`\<`F`\>\[`0`\]\>, `"input"`\> & `object`

#### Returns

`void`
