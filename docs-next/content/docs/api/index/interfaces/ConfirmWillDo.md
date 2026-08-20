---
title: ConfirmWillDo
---

# Interface: ConfirmWillDo

Defined in: [src/atom/types.ts:2786](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2786)

The plain-words "what firing will do" claim that leads a receipt: the
authored edge description plus its declared, honesty-tagged effect. `writes`
and `navigatesTo` are CLAIMS about the app's handler (verified at settlement
/ reconciled by sync), never observed truths — the same honesty stance the
atom takes everywhere.

## Properties

### does

> **does**: `string`

Defined in: [src/atom/types.ts:2788](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2788)

The authored affordance description (planner-facing string class).

***

### effectUnverifiable?

> `optional` **effectUnverifiable?**: `boolean`

Defined in: [src/atom/types.ts:2809](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2809)

True when the edge declares writes but the session has no state tap, so the
effect can never be verified (settlement would be effectVerified:
'unobservable'). Stated up front so the human is not shown a claim the
library itself cannot check.

***

### navigatesTo?

> `optional` **navigatesTo?**: `string`

Defined in: [src/atom/types.ts:2802](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2802)

Page this edge CLAIMS to navigate to (from effect.navigatesTo). Omitted when none.

***

### reads?

> `optional` **reads?**: `string`[]

Defined in: [src/atom/types.ts:2800](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2800)

State keys this edge CLAIMS its outcome depends on (from effect.reads).
Omitted when none — the same presence law `writes` keeps.

On the card a HUMAN reads, because the person approving a "settle for the
amount on the claim" is entitled to know which claim number the amount will
be read from. A CLAIM about the app's handler like everything else in this
block, never an observation.

***

### writes?

> `optional` **writes?**: `string`[]

Defined in: [src/atom/types.ts:2790](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2790)

State keys this edge CLAIMS to write (from effect.writes). Omitted when none.
