---
title: DoActionArgs
---

# Interface: DoActionArgs

Defined in: [src/serve/modes.ts:77](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L77)

## Properties

### action

> **action**: `string`

Defined in: [src/serve/modes.ts:78](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L78)

***

### confirm?

> `optional` **confirm?**: `boolean`

Defined in: [src/serve/modes.ts:80](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L80)

***

### decline?

> `optional` **decline?**: `boolean`

Defined in: [src/serve/modes.ts:86](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L86)

Record the human's refusal of a high-effect action (they said no) — closes
the ask, does not fire. Under `requireHumanApproval` it is recorded as the
caller's REPORT and closes nothing, so the person's card stays live.

***

### input?

> `optional` **input?**: `unknown`

Defined in: [src/serve/modes.ts:79](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L79)

***

### instance?

> `optional` **instance?**: `string`

Defined in: [src/serve/modes.ts:87](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L87)
