---
title: ActionCapture
---

# Interface: ActionCapture

Defined in: [src/contextful/types.ts:214](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/types.ts#L214)

THE CAPTURE ENVELOPE — what a contextful action's fire recorded around
itself, on [TransitionRecord.captured](/api/index/interfaces/TransitionRecord#captured).

`before` and `after`/`failure` are stamped by the fire itself, so a
settlement receipt carries them. `sensed` lands one turn later, on the LIVE
record only — the `arrival: 'observed'` precedent, for the same reason: a
receipt taken at rest is never rewritten.

## Properties

### after?

> `optional` **after?**: [`CaptureAfter`](/api/index/interfaces/CaptureAfter)

Defined in: [src/contextful/types.ts:216](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/types.ts#L216)

***

### before

> **before**: [`CaptureBefore`](/api/index/interfaces/CaptureBefore)

Defined in: [src/contextful/types.ts:215](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/types.ts#L215)

***

### failure?

> `optional` **failure?**: [`CaptureFailure`](/api/index/interfaces/CaptureFailure)

Defined in: [src/contextful/types.ts:217](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/types.ts#L217)

***

### sensed?

> `optional` **sensed?**: [`SensedSummary`](/api/index/interfaces/SensedSummary)

Defined in: [src/contextful/types.ts:218](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/types.ts#L218)
