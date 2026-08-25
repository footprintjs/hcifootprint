---
title: ActionSettlementCapability<Id>
---

# Interface: ActionSettlementCapability\<Id\>

Defined in: [src/action/types.ts:303](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L303)

The only connection authority exposed to an invocation observer.

## Type Parameters

### Id

`Id` *extends* `string` = `string`

## Properties

### binding

> `readonly` **binding**: [`ActionBindingRef`](/api/index/interfaces/ActionBindingRef)\<`Id`\>

Defined in: [src/action/types.ts:304](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L304)

## Methods

### settle()

> **settle**(`settlement`): [`ActionEffectSettlement`](/api/index/type-aliases/ActionEffectSettlement)\<`Id`\>

Defined in: [src/action/types.ts:305](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L305)

#### Parameters

##### settlement

[`ActionEffectSettlementInput`](/api/index/type-aliases/ActionEffectSettlementInput)

#### Returns

[`ActionEffectSettlement`](/api/index/type-aliases/ActionEffectSettlement)\<`Id`\>
