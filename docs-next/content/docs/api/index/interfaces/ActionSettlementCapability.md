---
title: ActionSettlementCapability<Id>
---

# Interface: ActionSettlementCapability\<Id\>

Defined in: [src/action/types.ts:351](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L351)

The only connection authority exposed to an invocation observer.

## Type Parameters

### Id

`Id` *extends* `string` = `string`

## Properties

### binding

> `readonly` **binding**: [`ActionBindingRef`](/api/index/interfaces/ActionBindingRef)\<`Id`\>

Defined in: [src/action/types.ts:352](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L352)

## Methods

### settle()

> **settle**(`settlement`): [`ActionEffectSettlement`](/api/index/type-aliases/ActionEffectSettlement)\<`Id`\>

Defined in: [src/action/types.ts:353](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L353)

#### Parameters

##### settlement

[`ActionEffectSettlementInput`](/api/index/type-aliases/ActionEffectSettlementInput)

#### Returns

[`ActionEffectSettlement`](/api/index/type-aliases/ActionEffectSettlement)\<`Id`\>
