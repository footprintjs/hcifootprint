---
title: SkillCallArgs
---

# Interface: SkillCallArgs

Defined in: [src/serve/modes.ts:62](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L62)

## Properties

### confirm?

> `optional` **confirm?**: `boolean`

Defined in: [src/serve/modes.ts:65](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L65)

***

### decline?

> `optional` **decline?**: `boolean`

Defined in: [src/serve/modes.ts:71](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L71)

Record the human's refusal of a high-effect step (they said no) — closes the
ask, does not fire. Under `requireHumanApproval` it is recorded as the
caller's REPORT and closes nothing, so the person's card stays live.

***

### input?

> `optional` **input?**: `unknown`

Defined in: [src/serve/modes.ts:64](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L64)

***

### instance?

> `optional` **instance?**: `string`

Defined in: [src/serve/modes.ts:73](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L73)

Instance key for steps on repeats containers (from `instances` in results).

***

### step?

> `optional` **step?**: `string`

Defined in: [src/serve/modes.ts:63](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L63)
