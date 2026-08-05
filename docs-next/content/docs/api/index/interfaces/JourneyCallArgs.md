---
title: JourneyCallArgs
---

# Interface: JourneyCallArgs

Defined in: [src/serve/modes.ts:102](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L102)

## Properties

### confirm?

> `optional` **confirm?**: `boolean`

Defined in: [src/serve/modes.ts:105](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L105)

***

### decline?

> `optional` **decline?**: `boolean`

Defined in: [src/serve/modes.ts:111](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L111)

Record the human's refusal of a high-effect step (they said no) — closes the
ask, does not fire. Under `requireHumanApproval` it is recorded as the
caller's REPORT and closes nothing, so the person's card stays live.

***

### input?

> `optional` **input?**: `unknown`

Defined in: [src/serve/modes.ts:104](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L104)

***

### instance?

> `optional` **instance?**: `string`

Defined in: [src/serve/modes.ts:113](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L113)

Instance key for steps on repeats containers (from `instances` in results).

***

### step?

> `optional` **step?**: `string`

Defined in: [src/serve/modes.ts:103](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L103)
