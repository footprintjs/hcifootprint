---
title: ActionInvocation<Output, Id>
---

# Interface: ActionInvocation\<Output, Id\>

Defined in: [src/action/types.ts:272](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L272)

## Type Parameters

### Output

`Output`

### Id

`Id` *extends* `string` = `string`

## Properties

### input

> `readonly` **input**: [`ActionInvocationInput`](/api/index/type-aliases/ActionInvocationInput)

Defined in: [src/action/types.ts:275](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L275)

Auditable input origin; the payload value itself is deliberately not disclosed.

***

### transition

> `readonly` **transition**: [`ActionTransitionRef`](/api/index/interfaces/ActionTransitionRef)\<`Id`\>

Defined in: [src/action/types.ts:273](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L273)

***

### whenEffectSettled

> `readonly` **whenEffectSettled**: `Promise`\<[`ActionEffectSettlement`](/api/index/type-aliases/ActionEffectSettlement)\<`Id`\>\>

Defined in: [src/action/types.ts:279](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L279)

Authoritative effect observation. Handler completion never settles it.

***

### whenInvoked

> `readonly` **whenInvoked**: `Promise`\<[`ActionInvocationSettlement`](/api/index/type-aliases/ActionInvocationSettlement)\<`Output`, `Id`\>\>

Defined in: [src/action/types.ts:277](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L277)

Invocation outcome. This promise always resolves; refusal/failure are data.
