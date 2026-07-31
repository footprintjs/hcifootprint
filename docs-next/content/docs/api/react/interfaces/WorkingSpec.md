---
title: WorkingSpec
---

# Interface: WorkingSpec

Defined in: src/react/use-working.ts:100

What a component says about the work it is doing right now.

## Properties

### busy

> `readonly` **busy**: `boolean`

Defined in: src/react/use-working.ts:110

YOUR OWN SPINNER FLAG — the boolean this component already renders from.

Pass the one you already have (`mutation.isPending`, `isSaving`, your
store's own field). A flag maintained ONLY for this hook is a second copy of
a fact, and the copy nobody looks at is the one that rots: it is the shape
that leaves a work row open after the work finished, because nothing on
screen depended on it being right.

***

### error?

> `readonly` `optional` **error?**: `unknown`

Defined in: src/react/use-working.ts:144

The error you are already rendering, if the work ended badly.

READ BY PRESENCE AT FALL TIME, and only then: whatever this holds on the
commit where `busy` goes false is what the work row records, and an absent
one closes the row cleanly. So set the flag and the error together — React
batches both updates from one `catch` into a single commit, which is what
makes "completion and outcome arrive together" the ordinary case rather than
a rule to remember. It is recorded on the WORK ROW ONLY: it settles nothing,
rejects nothing, and reaches no door that answers how a FIRE came to rest.

`null` IS ABSENT HERE, exactly as `undefined` is. React's ecosystem says "no
error" with `null` — `mutation.error` is `null` on every clean settle — and a
hook whose own headline example passes that field must mean the same thing by
it that the app does. Nothing else is normalized: any other value is the
app's word and travels whole.

IT IS NOT REMEMBERED BETWEEN EPISODES, because it is not this hook's to
remember: an error your component still renders when the NEXT piece of work
ends is read at that fall too, and closes that row carrying a failure it never
had. A data layer that resets its own error on each attempt (React Query
does) is already correct; a hand-rolled one clears it where it sets the flag.

***

### label

> `readonly` **label**: `string`

Defined in: src/react/use-working.ts:120

Your own words for what is happening — 'Saving your draft…'.

It rides two rails as DATA and never enters an authored sentence: the work
row's `label`, and the `busy` label on every control in `tools`. The core
caps it and refuses a non-string with its own warning; nothing here judges
it. Write labels a stranger may read — never interpolate a secret, a
customer's name, or the payload.

***

### session

> `readonly` **session**: [`WorkingSession`](/api/react/type-aliases/WorkingSession)

Defined in: src/react/use-working.ts:163

The session this component reports to.

***

### tools?

> `readonly` `optional` **tools?**: [`BusyControl`](/api/react/type-aliases/BusyControl) \| readonly [`BusyControl`](/api/react/type-aliases/BusyControl)[]

Defined in: src/react/use-working.ts:161

The control handle, or handles, that should carry the label while this is
working — the spinner in the button, said out loud on the row a model reads.

Omit it and the hook keeps the work ledger only, which is the honest answer
for work no single control stands for (a background sync, a page-level
load). ONE WRITER PER CONTROL: point the hook at a handle or drive that
handle's `setBusy` by hand, never both, or two writers will take turns
describing one control.

An adapter written inline is FINE and needs no memo. Identity is all this
hook can compare, so a fresh object each render is a new control to it — the
old one is told to stop and the new one to start, about one tool — and the
session coalesces world motion by fingerprint, so a take-back-and-re-say
inside one window cancels to nothing at all.

***

### transitionId?

> `readonly` `optional` **transitionId?**: `string`

Defined in: src/react/use-working.ts:185

The fire this work belongs to — a `transitionId` from a `FireResult`.

WITHOUT IT THE ROW IS UNBOUND, at principal `'system'`, and that is the
honest answer rather than a shortfall: an effect runs long after any
handler's call window closed, so there is no fire this hook is "inside of"
and a guess would be right exactly when nothing was racing. Unbound work
still says the app is working; it just does not claim which action. The core
says so once per label, and this hook does not suppress that.

KNOWN ON THE COMMIT WHERE THE FLAG GOES UP, OR NOT AT ALL. This is read once,
where the row opens, because the core decides where work lands at call time
and never revisits it — so an id that arrives on a later commit does not move
the row it missed, and the hook says so once instead of dropping it in
silence. A flag that rises before its own fire has one (a mutation's
`isPending` flips before the function that fires runs) is exactly that shape:
set the flag and the id from ONE state update after the fire result hands the
id back, or open the work inside the handler before its first `await`, where
it binds itself. Neither is available? Leave it out — unbound is honest, and
the next rise reads whatever is in hand then.
