---
title: EffectStatus
---

# Type Alias: EffectStatus

> **EffectStatus** = `"pending"` \| `"performed"` \| `"refused"` \| `"unobservable"`

Defined in: [src/atom/types.ts:1164](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1164)

What became of a fire's effect — the INVOCATION axis, deliberately separate
from `TransitionRecord.effectVerified` (the STATE axis: were the declared
writes actually observed?). The two disagree honestly all the time: a
handler can run to completion in a session with no state tap ('performed'
with effectVerified 'unobservable'), and a handler can fail AFTER its real
state report already landed ('refused' with effectVerified true). Both
truths are carried; neither is averaged into the other.

- `pending`      — deferred, not yet decided. Only ever seen on the
                   synchronous FireResult: fire() returns before the handler
                   runs, so at that instant this is the honest answer.
- `performed`    — our side ran to completion, or the app's state report
                   settled the record.
- `refused`      — the handler threw, returned a failure, the app called
                   reject(), OR the action's declared `verify` contract found
                   that nothing happened. Four routes, one word: to a caller
                   they all mean "the app did not do the thing".
- `unobservable` — nothing was bound to run, or tracking stopped
                   ('superseded'). The library cannot know, so it says so
                   rather than guessing 'performed'.
