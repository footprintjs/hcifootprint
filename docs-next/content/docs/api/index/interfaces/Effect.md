---
title: Effect
---

# Interface: Effect

Defined in: [src/atom/types.ts:223](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L223)

## Properties

### navigatesTo?

> `optional` **navigatesTo?**: `string`

Defined in: [src/atom/types.ts:254](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L254)

Page this affordance claims to move to. Reconciled by sync().

***

### reads?

> `optional` **reads?**: `string`[]

Defined in: [src/atom/types.ts:252](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L252)

State keys this affordance's OUTCOME DEPENDS ON — the read side of the same
declaration, and the half that was missing.

An app could always say what a control CHANGES and never what it is ABOUT.
So a session that knew a key had just moved (`contextBrief` names the
changed keys, by name, in the turn before the fire) could not say which of
the offered controls that change was about, and a reader was left to join
two lists by eye. Declare it and the serving layer stamps `staleReads` on
the row — this key changed since you last looked, and this control reads it.

NOT the guard. `guard` keys are the PRECONDITION read set — whether the
control is on offer at all — and they are already served as `evidence`.
These are the keys whose values the outcome is computed FROM: a "settle the
claim" button guarded on `claim.stage` may compute its amount from
`order.total`, and it is the second one a staleness reader needs named.

DECLARED, NEVER INFERRED. The library does not read your handler, guess
from co-occurrence, or promote a guard key. Which keys matter is meaning,
and meaning stays on the app's side of the seam — the same law `writes`
lives under. An app that declares nothing here serves byte-identical rows.

Key NAMES only. No value crosses on this wire, and nothing here is compared
against anything: the stamp says a key you depend on was written since your
last look, not that the value is wrong or that firing would be a mistake.

***

### writes?

> `optional` **writes?**: `string`[]

Defined in: [src/atom/types.ts:225](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L225)

State keys this affordance claims to change. Verified at settlement.
