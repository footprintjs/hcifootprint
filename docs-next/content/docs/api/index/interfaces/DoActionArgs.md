---
title: DoActionArgs
---

# Interface: DoActionArgs

Defined in: [src/serve/modes.ts:69](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L69)

## Properties

### action

> **action**: `string`

Defined in: [src/serve/modes.ts:70](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L70)

***

### confirm?

> `optional` **confirm?**: `boolean`

Defined in: [src/serve/modes.ts:72](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L72)

***

### decline?

> `optional` **decline?**: `boolean`

Defined in: [src/serve/modes.ts:78](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L78)

Record the human's refusal of a high-effect action (they said no) — closes
the ask, does not fire. Under `requireHumanApproval` it is recorded as the
caller's REPORT and closes nothing, so the person's card stays live.

***

### input?

> `optional` **input?**: `unknown`

Defined in: [src/serve/modes.ts:71](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L71)

***

### instance?

> `optional` **instance?**: `string`

Defined in: [src/serve/modes.ts:79](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L79)
