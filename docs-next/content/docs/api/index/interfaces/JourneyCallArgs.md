---
title: JourneyCallArgs
---

# Interface: JourneyCallArgs

Defined in: [src/serve/modes.ts:117](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L117)

## Properties

### acknowledgementId?

> `optional` **acknowledgementId?**: `string`

Defined in: [src/serve/modes.ts:132](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L132)

The acknowledgement this step performs — see [DoActionArgs.acknowledgementId](/api/index/interfaces/DoActionArgs#acknowledgementid).

***

### confirm?

> `optional` **confirm?**: `boolean`

Defined in: [src/serve/modes.ts:120](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L120)

***

### decline?

> `optional` **decline?**: `boolean`

Defined in: [src/serve/modes.ts:126](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L126)

Record the human's refusal of a high-effect step (they said no) — closes the
ask, does not fire. Under `requireHumanApproval` it is recorded as the
caller's REPORT and closes nothing, so the person's card stays live.

***

### input?

> `optional` **input?**: `unknown`

Defined in: [src/serve/modes.ts:119](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L119)

***

### instance?

> `optional` **instance?**: `string`

Defined in: [src/serve/modes.ts:128](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L128)

Instance key for steps on repeats containers (from `instances` in results).

***

### offerId?

> `optional` **offerId?**: `string`

Defined in: [src/serve/modes.ts:130](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L130)

The served row this step was planned against — see [DoActionArgs.offerId](/api/index/interfaces/DoActionArgs#offerid).

***

### step?

> `optional` **step?**: `string`

Defined in: [src/serve/modes.ts:118](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L118)
