---
title: SessionEvents
---

# Interface: SessionEvents

Defined in: [src/atom/types.ts:420](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L420)

## Properties

### confirm

> **confirm**: [`ConfirmRecord`](/api/index/interfaces/ConfirmRecord)

Defined in: [src/atom/types.ts:430](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L430)

A confirm-journal row landed — an ask, an approval, or a decline (a deep copy).

***

### gap

> **gap**: [`GapRecord`](/api/index/interfaces/GapRecord)

Defined in: [src/atom/types.ts:428](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L428)

A new unmet-demand row was recorded (a deep copy).

***

### state

> **state**: `object`

Defined in: [src/atom/types.ts:424](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L424)

A committed state delta landed (the `state` version moved).

#### stateVersion

> **stateVersion**: `number`

#### version

> **version**: `number`

***

### structure

> **structure**: `object`

Defined in: [src/atom/types.ts:426](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L426)

The served tool-surface changed — frame open/close, or a mount/enable flip.

#### structureVersion

> **structureVersion**: `number`

#### version

> **version**: `number`

***

### transition

> **transition**: [`TransitionRecord`](/api/index/interfaces/TransitionRecord)

Defined in: [src/atom/types.ts:422](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L422)

A new or newly-settled occurrence (a snapshot of the record).
