---
title: PendingInfo
---

# Interface: PendingInfo

Defined in: [src/atom/types.ts:2470](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2470)

A fired transition still awaiting its state report.

## Properties

### affordanceId

> **affordanceId**: `string`

Defined in: [src/atom/types.ts:2472](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2472)

***

### does?

> `optional` **does?**: `string`

Defined in: [src/atom/types.ts:2479](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2479)

What the app said this action does, frozen when the fire was recorded —
see [Cause.does](/api/index/interfaces/Cause#does). Carried here so a fire still awaiting its report can
be NAMED after the component that declared it has gone: the row a reader
sees is the one the session minted, not a fresh look at a spec that moved.

***

### firedAt

> **firedAt**: `number`

Defined in: [src/atom/types.ts:2480](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2480)

***

### id

> **id**: `string`

Defined in: [src/atom/types.ts:2471](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2471)
