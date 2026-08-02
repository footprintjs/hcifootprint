---
title: SessionEvents
---

# Interface: SessionEvents

Defined in: [src/atom/types.ts:468](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L468)

## Properties

### confirm

> **confirm**: [`ConfirmRecord`](/api/index/interfaces/ConfirmRecord)

Defined in: [src/atom/types.ts:484](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L484)

A confirm-journal row landed — an ask, an approval, or a decline (a deep copy).

***

### gap

> **gap**: [`GapRecord`](/api/index/interfaces/GapRecord)

Defined in: [src/atom/types.ts:482](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L482)

A new unmet-demand row was recorded (a deep copy).

***

### state

> **state**: `object`

Defined in: [src/atom/types.ts:478](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L478)

A committed state delta landed (the `state` version moved).

#### stateVersion

> **stateVersion**: `number`

#### version

> **version**: `number`

***

### structure

> **structure**: `object`

Defined in: [src/atom/types.ts:480](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L480)

The served tool-surface changed — frame open/close, or a mount/enable flip.

#### structureVersion

> **structureVersion**: `number`

#### version

> **version**: `number`

***

### transition

> **transition**: [`TransitionRecord`](/api/index/interfaces/TransitionRecord)

Defined in: [src/atom/types.ts:476](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L476)

A new, newly-settled, or newly-corroborated occurrence (a snapshot of the
record). The third case is [TransitionRecord.arrival](/api/index/interfaces/TransitionRecord#arrival) turning
'observed': the record did not change otherwise and the version did not move,
so a consumer counting events per fire sees one more than it did before 0.9.0
for a fire whose edge declares `navigatesTo`.
