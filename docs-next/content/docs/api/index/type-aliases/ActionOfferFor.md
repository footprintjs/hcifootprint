---
title: ActionOfferFor<F, Id, Mode>
---

# Type Alias: ActionOfferFor\<F, Id, Mode\>

> **ActionOfferFor**\<`F`, `Id`, `Mode`\> = `Mode` *extends* `"host"` ? `never` : `Mode` *extends* `"inputless"` ? [`InputlessActionOffer`](/api/index/interfaces/InputlessActionOffer)\<`Id`, `F`\> : `Mode` *extends* `"scalar"` ? [`BoundActionOffer`](/api/index/interfaces/BoundActionOffer)\<`Id`, `F`\> \| [`OpenActionOffer`](/api/index/interfaces/OpenActionOffer)\<`Id`, `F`\> : `never`

Defined in: [src/action/types.ts:373](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L373)

Offers possible for one known callable signature.

## Type Parameters

### F

`F` *extends* (...`args`) => `any`

### Id

`Id` *extends* `string` = `string`

### Mode

`Mode` *extends* [`ActionInvocationMode`](/api/index/type-aliases/ActionInvocationMode) = [`ActionInvocationMode`](/api/index/type-aliases/ActionInvocationMode)
