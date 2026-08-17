---
title: JourneyCallArgs
---

# Interface: JourneyCallArgs

Defined in: [src/serve/modes.ts:104](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L104)

## Properties

### acknowledgementId?

> `optional` **acknowledgementId?**: `string`

Defined in: [src/serve/modes.ts:119](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L119)

The acknowledgement this step performs — see [DoActionArgs.acknowledgementId](/api/index/interfaces/DoActionArgs#acknowledgementid).

***

### confirm?

> `optional` **confirm?**: `boolean`

Defined in: [src/serve/modes.ts:107](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L107)

***

### decline?

> `optional` **decline?**: `boolean`

Defined in: [src/serve/modes.ts:113](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L113)

Record the human's refusal of a high-effect step (they said no) — closes the
ask, does not fire. Under `requireHumanApproval` it is recorded as the
caller's REPORT and closes nothing, so the person's card stays live.

***

### input?

> `optional` **input?**: `unknown`

Defined in: [src/serve/modes.ts:106](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L106)

***

### instance?

> `optional` **instance?**: `string`

Defined in: [src/serve/modes.ts:115](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L115)

Instance key for steps on repeats containers (from `instances` in results).

***

### offerId?

> `optional` **offerId?**: `string`

Defined in: [src/serve/modes.ts:117](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L117)

The served row this step was planned against — see [DoActionArgs.offerId](/api/index/interfaces/DoActionArgs#offerid).

***

### step?

> `optional` **step?**: `string`

Defined in: [src/serve/modes.ts:105](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L105)
