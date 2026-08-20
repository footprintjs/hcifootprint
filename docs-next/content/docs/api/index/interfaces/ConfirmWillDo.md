---
title: ConfirmWillDo
---

# Interface: ConfirmWillDo

Defined in: [src/atom/types.ts:2817](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2817)

The plain-words "what firing will do" claim that leads a receipt: the
authored edge description plus its declared, honesty-tagged effect. `writes`
and `navigatesTo` are CLAIMS about the app's handler (verified at settlement
/ reconciled by sync), never observed truths — the same honesty stance the
atom takes everywhere.

## Properties

### does

> **does**: `string`

Defined in: [src/atom/types.ts:2819](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2819)

The authored affordance description (planner-facing string class).

***

### effectUnverifiable?

> `optional` **effectUnverifiable?**: `boolean`

Defined in: [src/atom/types.ts:2840](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2840)

True when the edge declares writes but the session has no state tap, so the
effect can never be verified (settlement would be effectVerified:
'unobservable'). Stated up front so the human is not shown a claim the
library itself cannot check.

***

### navigatesTo?

> `optional` **navigatesTo?**: `string`

Defined in: [src/atom/types.ts:2833](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2833)

Page this edge CLAIMS to navigate to (from effect.navigatesTo). Omitted when none.

***

### reads?

> `optional` **reads?**: `string`[]

Defined in: [src/atom/types.ts:2831](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2831)

State keys this edge CLAIMS its outcome depends on (from effect.reads).
Omitted when none — the same presence law `writes` keeps.

On the card a HUMAN reads, because the person approving a "settle for the
amount on the claim" is entitled to know which claim number the amount will
be read from. A CLAIM about the app's handler like everything else in this
block, never an observation.

***

### writes?

> `optional` **writes?**: `string`[]

Defined in: [src/atom/types.ts:2821](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2821)

State keys this edge CLAIMS to write (from effect.writes). Omitted when none.
