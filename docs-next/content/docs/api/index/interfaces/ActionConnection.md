---
title: ActionConnection<F, Id, HasInputReader>
---

# Interface: ActionConnection\<F, Id, HasInputReader\>

Defined in: [src/action/types.ts:268](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L268)

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

Defined in: [src/action/types.ts:274](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L274)

***

### definition

> `readonly` **definition**: [`ActionDefinitionRef`](/api/index/interfaces/ActionDefinitionRef)\<`Id`\>

Defined in: [src/action/types.ts:273](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L273)

***

### invoke

> `readonly` **invoke**: [`ActionInvoke`](/api/index/type-aliases/ActionInvoke)\<`F`, `Id`, `HasInputReader`\>

Defined in: [src/action/types.ts:290](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L290)

***

### invokeOffered

> `readonly` **invokeOffered**: [`ActionOfferedInvoke`](/api/index/type-aliases/ActionOfferedInvoke)\<`F`, `Id`, `HasInputReader`\>

Defined in: [src/action/types.ts:292](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L292)

Invoke under one exact previously exposed offer, without an argument-slot sentinel.

## Methods

### attach()

> **attach**(`projection`): [`ActionAttachment`](/api/index/interfaces/ActionAttachment)

Defined in: [src/action/types.ts:275](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L275)

#### Parameters

##### projection

[`BindingProjection`](/api/index/interfaces/BindingProjection)

#### Returns

[`ActionAttachment`](/api/index/interfaces/ActionAttachment)

***

### disconnect()

> **disconnect**(): `void`

Defined in: [src/action/types.ts:305](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L305)

#### Returns

`void`

***

### invokeContinuation()

> **invokeContinuation**(`continuation`): [`ActionInvocation`](/api/index/interfaces/ActionInvocation)\<`Awaited`\<`ReturnType`\<`F`\>\>, `Id`\>

Defined in: [src/action/types.ts:298](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L298)

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

Defined in: [src/action/types.ts:301](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L301)

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

Defined in: [src/action/types.ts:276](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L276)

#### Parameters

##### update

`HasInputReader` *extends* `true` ? [`ActionBindingUpdate`](/api/index/interfaces/ActionBindingUpdate)\<`Parameters`\<`F`\> *extends* \[\] ? `undefined` : `Parameters`\<`F`\>\[`0`\]\> : `Omit`\<[`ActionBindingUpdate`](/api/index/interfaces/ActionBindingUpdate)\<`Parameters`\<`F`\> *extends* \[\] ? `undefined` : `Parameters`\<`F`\>\[`0`\]\>, `"input"`\> & `object`

#### Returns

`void`
