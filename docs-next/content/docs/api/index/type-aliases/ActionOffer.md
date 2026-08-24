---
title: ActionOffer<Id, F>
---

# Type Alias: ActionOffer\<Id, F\>

> **ActionOffer**\<`Id`, `F`\> = [`BoundActionOffer`](/api/index/interfaces/BoundActionOffer)\<`Id`, `F`\> \| [`OpenActionOffer`](/api/index/interfaces/OpenActionOffer)\<`Id`, `F`\> \| [`InputlessActionOffer`](/api/index/interfaces/InputlessActionOffer)\<`Id`, `F`\>

Defined in: [src/action/types.ts:364](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L364)

A retained in-process capability. Across a transport, keep it beside the
runtime and send only an opaque handle plus a serializable projection.

## Type Parameters

### Id

`Id` *extends* `string` = `string`

### F

`F` *extends* (...`args`) => `any` = (...`args`) => `any`
