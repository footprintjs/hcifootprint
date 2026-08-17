---
title: DoActionArgs
---

# Interface: DoActionArgs

Defined in: [src/serve/modes.ts:122](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L122)

## Properties

### acknowledgementId?

> `optional` **acknowledgementId?**: `string`

Defined in: [src/serve/modes.ts:146](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L146)

The acknowledgement this call performs, for a `'require-ack'` axis — the id
`session.acknowledgeStale()` handed back. It proves the protocol step was
PERFORMED and says nothing about anything being understood.

***

### action

> **action**: `string`

Defined in: [src/serve/modes.ts:123](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L123)

***

### confirm?

> `optional` **confirm?**: `boolean`

Defined in: [src/serve/modes.ts:125](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L125)

***

### decline?

> `optional` **decline?**: `boolean`

Defined in: [src/serve/modes.ts:131](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L131)

Record the human's refusal of a high-effect action (they said no) — closes
the ask, does not fire. Under `requireHumanApproval` it is recorded as the
caller's REPORT and closes nothing, so the person's card stays live.

***

### input?

> `optional` **input?**: `unknown`

Defined in: [src/serve/modes.ts:124](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L124)

***

### instance?

> `optional` **instance?**: `string`

Defined in: [src/serve/modes.ts:132](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L132)

***

### offerId?

> `optional` **offerId?**: `string`

Defined in: [src/serve/modes.ts:140](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L140)

The served row this call was planned against — the `offerId` a `whats_here`
row carried. A CITATION to a session record, never a secret and never a
capability: holding one authorizes nothing, and every gate runs exactly as
it did. Required only where the app's freshness policy enforces an axis
([FreshnessPolicy](/api/index/interfaces/FreshnessPolicy)); ignored otherwise, beyond being recorded.
