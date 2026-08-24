---
title: ActionSettlementCapability<Id>
---

# Interface: ActionSettlementCapability\<Id\>

Defined in: [src/react/use-action-binding.ts:85](https://github.com/footprintjs/hcifootprint/blob/main/src/react/use-action-binding.ts#L85)

The only connection authority exposed to an effect observer.

## Type Parameters

### Id

`Id` *extends* `string` = `string`

## Properties

### binding

> `readonly` **binding**: [`ActionBindingRef`](/api/index/interfaces/ActionBindingRef)\<`Id`\>

Defined in: [src/react/use-action-binding.ts:86](https://github.com/footprintjs/hcifootprint/blob/main/src/react/use-action-binding.ts#L86)

## Methods

### settle()

> **settle**(`transition`, `settlement`): [`ActionEffectSettlement`](/api/index/type-aliases/ActionEffectSettlement)\<`Id`\>

Defined in: [src/react/use-action-binding.ts:87](https://github.com/footprintjs/hcifootprint/blob/main/src/react/use-action-binding.ts#L87)

#### Parameters

##### transition

[`ActionTransitionRef`](/api/index/interfaces/ActionTransitionRef)\<`Id`\>

##### settlement

[`ActionEffectSettlementInput`](/api/index/type-aliases/ActionEffectSettlementInput)

#### Returns

[`ActionEffectSettlement`](/api/index/type-aliases/ActionEffectSettlement)\<`Id`\>
