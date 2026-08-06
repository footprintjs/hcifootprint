---
title: PendingInfo
---

# Interface: PendingInfo

Defined in: [src/atom/types.ts:1366](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1366)

A fired transition still awaiting its state report.

## Properties

### affordanceId

> **affordanceId**: `string`

Defined in: [src/atom/types.ts:1368](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1368)

***

### does?

> `optional` **does?**: `string`

Defined in: [src/atom/types.ts:1375](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1375)

What the app said this action does, frozen when the fire was recorded —
see [Cause.does](/api/index/interfaces/Cause#does). Carried here so a fire still awaiting its report can
be NAMED after the component that declared it has gone: the row a reader
sees is the one the session minted, not a fresh look at a spec that moved.

***

### firedAt

> **firedAt**: `number`

Defined in: [src/atom/types.ts:1376](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1376)

***

### id

> **id**: `string`

Defined in: [src/atom/types.ts:1367](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1367)
