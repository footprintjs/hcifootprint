---
title: DecisionStatus
---

# Interface: DecisionStatus

Defined in: [src/atom/types.ts:2931](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2931)

ONE DECISION THAT BELONGS TO A PERSON, and whether it has been made — the rows
[Session.decisions](/api/index/classes/Session#decisions) serves, read at the moment you ask.

The sibling of [AskStatus](/api/index/interfaces/AskStatus): that one answers "is anything waiting on a
person?", this one answers "is anything a person's to decide?". They are
different questions with different next moves, so they keep separate rows and
share no vocabulary — no `askId` appears here, because a decision mints no
card and there is nothing for `did_it_work` to be asked about.

Graph-wide, like the ask book: a decision on another page still holds a
journey, so a row exists for every declaring control wherever it lives.

## Properties

### about?

> `optional` **about?**: `string`

Defined in: [src/atom/types.ts:2934](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2934)

The app's own words for what is being decided — DATA (see [HumanDecides.about](/api/index/interfaces/HumanDecides#about)).

***

### affordanceId

> **affordanceId**: `string`

Defined in: [src/atom/types.ts:2932](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2932)

***

### made

> **made**: `boolean` \| `"unknown"`

Defined in: [src/atom/types.ts:2950](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2950)

Whether the app's own `doneWhen` holds RIGHT NOW, evaluated fresh on every
call:

- `true` — it holds.
- `false` — it was evaluated and does not hold. Only an evaluable, failing
  condition may say this.
- `'unknown'` — it could not be evaluated (a key absent from the state view,
  or holding `undefined` — the same rule `guardUnevaluated` applies to
  guards), or no `doneWhen` was declared at all.

`'unknown'` IS NEVER COLLAPSED INTO "not yet". They are different answers to
different questions, exactly as an unevaluable guard is served with a marker
rather than treated as failed.

***

### madeBy?

> `optional` **madeBy?**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:2968](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2968)

WHO MADE IT — served beside `made: true` only, and minted from exactly the
identity-bearing rungs of `updateState`'s attribution ladder: a delta naming
a fired transition, a handler's own call window, or an attributed
`updateState(delta, { principal })`.

ABSENT IS THE HONEST ANSWER and the common one. The matching rungs — FIFO
settlement, the single-cover arm, effect-signature inference, the
unknown-stimulus floor — compute a JOIN, and a computed join never
attributes a human decision, so each of them CLEARS whatever the book held.
The decision is then visibly made and nobody is named: the library does not
say the human did it, and does not say they didn't.

Never inferred, never defaulted, and **never `'user'`** unless a door that
carries identity said `'user'`. A sentence typed in conversation reaches no
such door.
