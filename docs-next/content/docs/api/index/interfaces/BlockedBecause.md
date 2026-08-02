---
title: BlockedBecause
---

# Interface: BlockedBecause

Defined in: [src/atom/types.ts:261](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L261)

THE APP'S OWN REASON A CONTROL IS OFF — and WHO can clear it.

`enabled: false` says a control is switched off, and the authored refusal
beside it says out loud that nothing here knows why. That silence is correct
— the library must never invent a cause — but it is silence the app itself
could have filled: the component that greys the button usually knows exactly
what it is waiting for. This is the wire for saying it, in the app's own
words, as DATA.

`clearedBy` is the half a reader cannot infer from any sentence, and it is
the half that decides the next move. Three words, and each one is a different
turn:

- `'app'` — the app clears it. The agent WAITS; there is nothing to relay.
- `'user'` — a person clears it. The agent INTERRUPTS the human, which is the
  one move worth a turn here and the one it will not make from a sentence
  alone.
- `'invalid'` — something is wrong with what was supplied. The agent REPORTS
  a validation problem rather than waiting for a state that is not coming.

SAME TRUST TIER AS `does`: a registration-site source-code literal, carried
as data and never spliced into an authored sentence. The refusal's own words
are unchanged — this rides BESIDE them.

## Properties

### clearedBy

> **clearedBy**: `"user"` \| `"app"` \| `"invalid"`

Defined in: [src/atom/types.ts:265](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L265)

Who clears it: 'app' → the agent waits; 'user' → interrupt the person; 'invalid' → report a validation problem.

***

### says

> **says**: `string`

Defined in: [src/atom/types.ts:263](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L263)

Registration-site app text — the same string class, and the same trust tier, as `does`.
