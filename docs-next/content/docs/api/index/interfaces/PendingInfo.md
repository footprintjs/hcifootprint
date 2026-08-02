---
title: PendingInfo
---

# Interface: PendingInfo

Defined in: [src/atom/types.ts:1284](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1284)

A fired transition still awaiting its state report.

## Properties

### affordanceId

> **affordanceId**: `string`

Defined in: [src/atom/types.ts:1286](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1286)

***

### does?

> `optional` **does?**: `string`

Defined in: [src/atom/types.ts:1293](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1293)

What the app said this action does, frozen when the fire was recorded —
see [Cause.does](/api/index/interfaces/Cause#does). Carried here so a fire still awaiting its report can
be NAMED after the component that declared it has gone: the row a reader
sees is the one the session minted, not a fresh look at a spec that moved.

***

### firedAt

> **firedAt**: `number`

Defined in: [src/atom/types.ts:1294](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1294)

***

### id

> **id**: `string`

Defined in: [src/atom/types.ts:1285](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1285)
