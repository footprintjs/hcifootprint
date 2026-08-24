---
title: ActionInvocation<Output, Id>
---

# Interface: ActionInvocation\<Output, Id\>

Defined in: src/action/types.ts:153

## Type Parameters

### Output

`Output`

### Id

`Id` *extends* `string` = `string`

## Properties

### transition

> `readonly` **transition**: [`ActionTransitionRef`](/api/index/interfaces/ActionTransitionRef)\<`Id`\>

Defined in: src/action/types.ts:154

***

### whenEffectSettled

> `readonly` **whenEffectSettled**: `Promise`\<[`ActionEffectSettlement`](/api/index/type-aliases/ActionEffectSettlement)\<`Id`\>\>

Defined in: src/action/types.ts:158

Authoritative effect observation. Handler completion never settles it.

***

### whenInvoked

> `readonly` **whenInvoked**: `Promise`\<[`ActionInvocationSettlement`](/api/index/type-aliases/ActionInvocationSettlement)\<`Output`, `Id`\>\>

Defined in: src/action/types.ts:156

Application handler completion. This promise resolves; failure is data.
