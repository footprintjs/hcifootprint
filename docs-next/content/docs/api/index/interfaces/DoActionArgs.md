---
title: DoActionArgs
---

# Interface: DoActionArgs

Defined in: [src/serve/modes.ts:76](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L76)

## Properties

### action

> **action**: `string`

Defined in: [src/serve/modes.ts:77](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L77)

***

### confirm?

> `optional` **confirm?**: `boolean`

Defined in: [src/serve/modes.ts:79](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L79)

***

### decline?

> `optional` **decline?**: `boolean`

Defined in: [src/serve/modes.ts:85](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L85)

Record the human's refusal of a high-effect action (they said no) — closes
the ask, does not fire. Under `requireHumanApproval` it is recorded as the
caller's REPORT and closes nothing, so the person's card stays live.

***

### input?

> `optional` **input?**: `unknown`

Defined in: [src/serve/modes.ts:78](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L78)

***

### instance?

> `optional` **instance?**: `string`

Defined in: [src/serve/modes.ts:86](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L86)
