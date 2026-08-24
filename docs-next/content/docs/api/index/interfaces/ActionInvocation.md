---
title: ActionInvocation<Output, Id>
---

# Interface: ActionInvocation\<Output, Id\>

Defined in: [src/action/types.ts:163](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L163)

## Type Parameters

### Output

`Output`

### Id

`Id` *extends* `string` = `string`

## Properties

### transition

> `readonly` **transition**: [`ActionTransitionRef`](/api/index/interfaces/ActionTransitionRef)\<`Id`\>

Defined in: [src/action/types.ts:164](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L164)

***

### whenEffectSettled

> `readonly` **whenEffectSettled**: `Promise`\<[`ActionEffectSettlement`](/api/index/type-aliases/ActionEffectSettlement)\<`Id`\>\>

Defined in: [src/action/types.ts:168](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L168)

Authoritative effect observation. Handler completion never settles it.

***

### whenInvoked

> `readonly` **whenInvoked**: `Promise`\<[`ActionInvocationSettlement`](/api/index/type-aliases/ActionInvocationSettlement)\<`Output`, `Id`\>\>

Defined in: [src/action/types.ts:166](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L166)

Application handler completion. This promise resolves; failure is data.
