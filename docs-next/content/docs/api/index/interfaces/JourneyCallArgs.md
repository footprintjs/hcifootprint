---
title: JourneyCallArgs
---

# Interface: JourneyCallArgs

Defined in: [src/serve/modes.ts:63](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L63)

## Properties

### confirm?

> `optional` **confirm?**: `boolean`

Defined in: [src/serve/modes.ts:66](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L66)

***

### decline?

> `optional` **decline?**: `boolean`

Defined in: [src/serve/modes.ts:72](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L72)

Record the human's refusal of a high-effect step (they said no) — closes the
ask, does not fire. Under `requireHumanApproval` it is recorded as the
caller's REPORT and closes nothing, so the person's card stays live.

***

### input?

> `optional` **input?**: `unknown`

Defined in: [src/serve/modes.ts:65](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L65)

***

### instance?

> `optional` **instance?**: `string`

Defined in: [src/serve/modes.ts:74](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L74)

Instance key for steps on repeats containers (from `instances` in results).

***

### step?

> `optional` **step?**: `string`

Defined in: [src/serve/modes.ts:64](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L64)
