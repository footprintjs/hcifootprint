---
title: ActionOfferFor<F, Id, Mode, P>
---

# Type Alias: ActionOfferFor\<F, Id, Mode, P\>

> **ActionOfferFor**\<`F`, `Id`, `Mode`, `P`\> = `Mode` *extends* `"host"` ? `never` : `Mode` *extends* `"inputless"` ? [`InputlessActionOffer`](/api/index/interfaces/InputlessActionOffer)\<`Id`, `F`, `P`\> : `Mode` *extends* `"scalar"` ? [`BoundActionOffer`](/api/index/interfaces/BoundActionOffer)\<`Id`, `F`, `P`\> \| [`OpenActionOffer`](/api/index/interfaces/OpenActionOffer)\<`Id`, `F`, `P`\> : `never`

Defined in: [src/action/types.ts:657](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L657)

Offers possible for one known callable signature.

## Type Parameters

### F

`F` *extends* (...`args`) => `any`

### Id

`Id` *extends* `string` = `string`

### Mode

`Mode` *extends* [`ActionInvocationMode`](/api/index/type-aliases/ActionInvocationMode) = [`ActionInvocationMode`](/api/index/type-aliases/ActionInvocationMode)

### P

`P` *extends* [`Principal`](/api/index/type-aliases/Principal) = [`Principal`](/api/index/type-aliases/Principal)
