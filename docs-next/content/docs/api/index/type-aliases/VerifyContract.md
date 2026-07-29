---
title: VerifyContract
---

# Type Alias: VerifyContract

> **VerifyContract** = `WhereFilter` \| ((`state`) => `boolean`)

Defined in: [src/atom/types.ts:139](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L139)

The app's OWN check that an action actually happened — declared once, next to
the action, and evaluated at settlement.

The library can observe that a handler ran to completion; it cannot observe
that a radio got selected or that the button it clicked was live. Reported
from the field: a fire returned `effectStatus: 'performed'` while nothing had
been selected, and the agent looped — correctly, on what it was told. This is
the one line that closes that gap.

Two forms, one meaning ("this must hold once the action has settled"):
- a serializable `WhereFilter` over projected state — evaluated by the
  same evaluator (and the same honesty split) as every guard;
- a synchronous predicate handed a DETACHED state snapshot, whose closure may
  read whatever the app itself can see, the DOM included.

A contract that does not hold turns the settlement's `effectStatus` into
'refused' (an existing word — nothing was renamed). A contract that cannot be
evaluated — an unknown state key, a predicate that threw — never refuses:
a wrong rejection blocks an action the app would have accepted, and the
caller has no appeal.
