---
title: ActionInvocation<Output, Id, Behavior>
---

# Interface: ActionInvocation\<Output, Id, Behavior\>

Defined in: [src/action/types.ts:459](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L459)

## Type Parameters

### Output

`Output`

### Id

`Id` *extends* `string` = `string`

### Behavior

`Behavior` *extends* `"mutation"` \| `"host-continuation"` = `"mutation"` \| `"host-continuation"`

## Properties

### behavior

> `readonly` **behavior**: `Behavior`

Defined in: [src/action/types.ts:468](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L468)

Which application behavior this occurrence executed.

***

### input

> `readonly` **input**: `Behavior` *extends* `"host-continuation"` ? `object` : `Behavior` *extends* `"mutation"` ? \{ `provided`: `false`; `source`: `"none"`; \} \| \{ `provided`: `true`; `ref`: [`ActionInputRef`](/api/index/interfaces/ActionInputRef)\<`"bound"`\>; `source`: `"bound"`; \} \| \{ `provided`: `false`; `source`: `"bound"`; \} \| \{ `provided`: `true`; `ref`: [`ActionInputRef`](/api/index/interfaces/ActionInputRef)\<`"caller"`\>; `source`: `"caller"`; \} \| \{ `provided`: `false`; `source`: `"caller"`; \} : [`ActionInvocationInput`](/api/index/type-aliases/ActionInvocationInput)

Defined in: [src/action/types.ts:470](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L470)

Auditable input origin; the payload value itself is deliberately not disclosed.

***

### progress?

> `readonly` `optional` **progress?**: `Behavior` *extends* `"host-continuation"` ? `never` : [`ActionProgress`](/api/index/interfaces/ActionProgress)

Defined in: [src/action/types.ts:480](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L480)

Present only for a mutation whose definition declared progress stages.

***

### transition

> `readonly` **transition**: [`ActionTransitionRef`](/api/index/interfaces/ActionTransitionRef)\<`Id`\>

Defined in: [src/action/types.ts:466](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L466)

***

### whenEffectSettled

> `readonly` **whenEffectSettled**: `Promise`\<[`ActionEffectSettlement`](/api/index/type-aliases/ActionEffectSettlement)\<`Id`\>\>

Defined in: [src/action/types.ts:478](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L478)

Authoritative effect observation. Handler completion never settles it.

***

### whenInvoked

> `readonly` **whenInvoked**: `Promise`\<[`ActionInvocationSettlement`](/api/index/type-aliases/ActionInvocationSettlement)\<`Output`, `Id`\>\>

Defined in: [src/action/types.ts:476](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L476)

Invocation outcome. This promise always resolves; refusal/failure are data.
