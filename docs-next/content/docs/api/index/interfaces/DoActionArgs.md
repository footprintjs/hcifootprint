---
title: DoActionArgs
---

# Interface: DoActionArgs

Defined in: [src/serve/modes.ts:116](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L116)

## Properties

### action

> **action**: `string`

Defined in: [src/serve/modes.ts:117](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L117)

***

### confirm?

> `optional` **confirm?**: `boolean`

Defined in: [src/serve/modes.ts:119](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L119)

***

### decline?

> `optional` **decline?**: `boolean`

Defined in: [src/serve/modes.ts:125](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L125)

Record the human's refusal of a high-effect action (they said no) — closes
the ask, does not fire. Under `requireHumanApproval` it is recorded as the
caller's REPORT and closes nothing, so the person's card stays live.

***

### input?

> `optional` **input?**: `unknown`

Defined in: [src/serve/modes.ts:118](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L118)

***

### instance?

> `optional` **instance?**: `string`

Defined in: [src/serve/modes.ts:126](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L126)
