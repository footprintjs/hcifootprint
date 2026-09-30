---
title: ActionOffer<Id, F, P>
---

# Type Alias: ActionOffer\<Id, F, P\>

> **ActionOffer**\<`Id`, `F`, `P`\> = [`BoundActionOffer`](/api/index/interfaces/BoundActionOffer)\<`Id`, `F`, `P`\> \| [`OpenActionOffer`](/api/index/interfaces/OpenActionOffer)\<`Id`, `F`, `P`\> \| [`InputlessActionOffer`](/api/index/interfaces/InputlessActionOffer)\<`Id`, `F`, `P`\>

Defined in: [src/action/types.ts:647](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L647)

A retained in-process capability. Across a transport, keep it beside the
runtime and send only an opaque handle plus a serializable projection.

## Type Parameters

### Id

`Id` *extends* `string` = `string`

### F

`F` *extends* (...`args`) => `any` = (...`args`) => `any`

### P

`P` *extends* [`Principal`](/api/index/type-aliases/Principal) = [`Principal`](/api/index/type-aliases/Principal)
