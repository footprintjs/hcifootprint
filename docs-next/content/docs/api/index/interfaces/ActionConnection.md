---
title: ActionConnection<F, Id, HasInputReader, Mode>
---

# Interface: ActionConnection\<F, Id, HasInputReader, Mode\>

Defined in: [src/action/types.ts:419](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L419)

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

Defined in: [src/action/types.ts:426](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L426)

***

### definition

> `readonly` **definition**: [`ActionDefinitionRef`](/api/index/interfaces/ActionDefinitionRef)\<`Id`\>

Defined in: [src/action/types.ts:425](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L425)

***

### invoke

> `readonly` **invoke**: [`ActionInvoke`](/api/index/type-aliases/ActionInvoke)\<`F`, `Id`, `HasInputReader`, `Mode`\>

Defined in: [src/action/types.ts:444](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L444)

## Methods

### attach()

> **attach**(`projection`): [`ActionAttachment`](/api/index/interfaces/ActionAttachment)

Defined in: [src/action/types.ts:427](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L427)

#### Parameters

##### projection

[`BindingProjection`](/api/index/interfaces/BindingProjection)

#### Returns

[`ActionAttachment`](/api/index/interfaces/ActionAttachment)

***

### disconnect()

> **disconnect**(): `void`

Defined in: [src/action/types.ts:457](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L457)

#### Returns

`void`

***

### invokeContinuation()

> **invokeContinuation**(`continuation`): [`ActionInvocation`](/api/index/interfaces/ActionInvocation)\<`Awaited`\<`ReturnType`\<`F`\>\>, `Id`\>

Defined in: [src/action/types.ts:450](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L450)

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

Defined in: [src/action/types.ts:453](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L453)

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

Defined in: [src/action/types.ts:443](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L443)

Publish a new committed fact generation when stable readers changed meaning.

#### Returns

`void`

***

### update()

> **update**(`update`): `void`

Defined in: [src/action/types.ts:428](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L428)

#### Parameters

##### update

`HasInputReader` *extends* `true` ? [`ActionBindingUpdate`](/api/index/interfaces/ActionBindingUpdate)\<`Parameters`\<`F`\> *extends* \[\] ? `undefined` : `Parameters`\<`F`\>\[`0`\]\> : `Omit`\<[`ActionBindingUpdate`](/api/index/interfaces/ActionBindingUpdate)\<`Parameters`\<`F`\> *extends* \[\] ? `undefined` : `Parameters`\<`F`\>\[`0`\]\>, `"input"`\> & `object`

#### Returns

`void`
