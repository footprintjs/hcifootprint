---
title: BeginWorkOptions
---

# Interface: BeginWorkOptions

Defined in: [src/atom/types.ts:1174](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1174)

Where a [Session.beginWork](/api/index/classes/Session#beginwork) call made OUTSIDE a handler belongs.

The mirror of [UpdateOptions.transitionId](/api/index/interfaces/UpdateOptions#transitionid), for the same reason:
identity has to travel with the report. Correlation is by CALL PATH, never by
recency — "the newest fire" is right exactly when nothing is racing and
silently wrong whenever the timing is interesting
(`docs/design/answer-grammar.md`, "How completion is correlated"). So a call
with nothing to bind to lands UNBOUND rather than guessing.

## Properties

### transitionId?

> `optional` **transitionId?**: `string`

Defined in: [src/atom/types.ts:1185](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1185)

The fire this work belongs to — a `transitionId` from a [FireResult](/api/index/type-aliases/FireResult).

EXPLICIT WINS, exactly as it does in [Session.updateState](/api/index/classes/Session#updatestate): pass this
from inside a handler and the row binds to the id you named, not to the
handler you happen to be in. An id this session does not know AS A FIRE
binds to nothing — the row lands unbound with one dev warning naming what is
live, because a row pointing at a fire that does not exist would claim a
relationship nothing can check.
