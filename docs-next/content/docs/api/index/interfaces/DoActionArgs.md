---
title: DoActionArgs
---

# Interface: DoActionArgs

Defined in: [src/serve/modes.ts:135](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L135)

## Properties

### acknowledgementId?

> `optional` **acknowledgementId?**: `string`

Defined in: [src/serve/modes.ts:159](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L159)

The acknowledgement this call performs, for a `'require-ack'` axis — the id
`session.acknowledgeStale()` handed back. It proves the protocol step was
PERFORMED and says nothing about anything being understood.

***

### action

> **action**: `string`

Defined in: [src/serve/modes.ts:136](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L136)

***

### confirm?

> `optional` **confirm?**: `boolean`

Defined in: [src/serve/modes.ts:138](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L138)

***

### decline?

> `optional` **decline?**: `boolean`

Defined in: [src/serve/modes.ts:144](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L144)

Record the human's refusal of a high-effect action (they said no) — closes
the ask, does not fire. Under `requireHumanApproval` it is recorded as the
caller's REPORT and closes nothing, so the person's card stays live.

***

### input?

> `optional` **input?**: `unknown`

Defined in: [src/serve/modes.ts:137](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L137)

***

### instance?

> `optional` **instance?**: `string`

Defined in: [src/serve/modes.ts:145](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L145)

***

### offerId?

> `optional` **offerId?**: `string`

Defined in: [src/serve/modes.ts:153](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L153)

The served row this call was planned against — the `offerId` a `whats_here`
row carried. A CITATION to a session record, never a secret and never a
capability: holding one authorizes nothing, and every gate runs exactly as
it did. Required only where the app's freshness policy enforces an axis
([FreshnessPolicy](/api/index/interfaces/FreshnessPolicy)); ignored otherwise, beyond being recorded.
