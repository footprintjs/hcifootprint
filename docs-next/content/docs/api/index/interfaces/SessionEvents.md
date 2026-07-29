---
title: SessionEvents
---

# Interface: SessionEvents

Defined in: [src/atom/types.ts:366](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L366)

## Properties

### confirm

> **confirm**: [`ConfirmRecord`](/api/index/interfaces/ConfirmRecord)

Defined in: [src/atom/types.ts:376](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L376)

A confirm-journal row landed — an ask, an approval, or a decline (a deep copy).

***

### gap

> **gap**: [`GapRecord`](/api/index/interfaces/GapRecord)

Defined in: [src/atom/types.ts:374](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L374)

A new unmet-demand row was recorded (a deep copy).

***

### state

> **state**: `object`

Defined in: [src/atom/types.ts:370](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L370)

A committed state delta landed (the `state` version moved).

#### stateVersion

> **stateVersion**: `number`

#### version

> **version**: `number`

***

### structure

> **structure**: `object`

Defined in: [src/atom/types.ts:372](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L372)

The served tool-surface changed — frame open/close, or a mount/enable flip.

#### structureVersion

> **structureVersion**: `number`

#### version

> **version**: `number`

***

### transition

> **transition**: [`TransitionRecord`](/api/index/interfaces/TransitionRecord)

Defined in: [src/atom/types.ts:368](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L368)

A new or newly-settled occurrence (a snapshot of the record).
