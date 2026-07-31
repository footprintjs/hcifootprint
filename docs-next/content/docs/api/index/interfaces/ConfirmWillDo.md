---
title: ConfirmWillDo
---

# Interface: ConfirmWillDo

Defined in: [src/atom/types.ts:1390](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1390)

The plain-words "what firing will do" claim that leads a receipt: the
authored edge description plus its declared, honesty-tagged effect. `writes`
and `navigatesTo` are CLAIMS about the app's handler (verified at settlement
/ reconciled by sync), never observed truths — the same honesty stance the
atom takes everywhere.

## Properties

### does

> **does**: `string`

Defined in: [src/atom/types.ts:1392](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1392)

The authored affordance description (planner-facing string class).

***

### effectUnverifiable?

> `optional` **effectUnverifiable?**: `boolean`

Defined in: [src/atom/types.ts:1403](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1403)

True when the edge declares writes but the session has no state tap, so the
effect can never be verified (settlement would be effectVerified:
'unobservable'). Stated up front so the human is not shown a claim the
library itself cannot check.

***

### navigatesTo?

> `optional` **navigatesTo?**: `string`

Defined in: [src/atom/types.ts:1396](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1396)

Page this edge CLAIMS to navigate to (from effect.navigatesTo). Omitted when none.

***

### writes?

> `optional` **writes?**: `string`[]

Defined in: [src/atom/types.ts:1394](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1394)

State keys this edge CLAIMS to write (from effect.writes). Omitted when none.
