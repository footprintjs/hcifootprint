---
title: SessionEvents
---

# Interface: SessionEvents

Defined in: [src/atom/types.ts:479](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L479)

## Properties

### confirm

> **confirm**: [`ConfirmRecord`](/api/index/interfaces/ConfirmRecord)

Defined in: [src/atom/types.ts:489](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L489)

A confirm-journal row landed — an ask, an approval, or a decline (a deep copy).

***

### gap

> **gap**: [`GapRecord`](/api/index/interfaces/GapRecord)

Defined in: [src/atom/types.ts:487](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L487)

A new unmet-demand row was recorded (a deep copy).

***

### state

> **state**: `object`

Defined in: [src/atom/types.ts:483](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L483)

A committed state delta landed (the `state` version moved).

#### stateVersion

> **stateVersion**: `number`

#### version

> **version**: `number`

***

### structure

> **structure**: `object`

Defined in: [src/atom/types.ts:485](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L485)

The served tool-surface changed — frame open/close, or a mount/enable flip.

#### structureVersion

> **structureVersion**: `number`

#### version

> **version**: `number`

***

### transition

> **transition**: [`TransitionRecord`](/api/index/interfaces/TransitionRecord)

Defined in: [src/atom/types.ts:481](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L481)

A new or newly-settled occurrence (a snapshot of the record).
