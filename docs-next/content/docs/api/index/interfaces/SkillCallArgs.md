---
title: SkillCallArgs
---

# Interface: SkillCallArgs

Defined in: [src/serve/modes.ts:55](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L55)

## Properties

### confirm?

> `optional` **confirm?**: `boolean`

Defined in: [src/serve/modes.ts:58](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L58)

***

### decline?

> `optional` **decline?**: `boolean`

Defined in: [src/serve/modes.ts:64](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L64)

Record the human's refusal of a high-effect step (they said no) — closes the
ask, does not fire. Under `requireHumanApproval` it is recorded as the
caller's REPORT and closes nothing, so the person's card stays live.

***

### input?

> `optional` **input?**: `unknown`

Defined in: [src/serve/modes.ts:57](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L57)

***

### instance?

> `optional` **instance?**: `string`

Defined in: [src/serve/modes.ts:66](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L66)

Instance key for steps on repeats containers (from `instances` in results).

***

### step?

> `optional` **step?**: `string`

Defined in: [src/serve/modes.ts:56](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L56)
