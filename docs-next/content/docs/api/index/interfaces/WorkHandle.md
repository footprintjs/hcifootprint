---
title: WorkHandle
---

# Interface: WorkHandle

Defined in: [src/atom/types.ts:1114](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1114)

A handle on one piece of work the app said it started — what
[Session.beginWork](/api/index/classes/Session#beginwork) hands back, and the only way to close the row it
opened.

PAIR IT LIKE A LOCK: open in the `try`, close in the `finally`, so a throw on
the way through cannot leave the row open.

```ts
const work = session.beginWork('Saving your draft');
try {
  await saveToServer();
} finally {
  work.done();
}
```

A handle nobody closes is never cleaned up. No timer expires it, because a
clock is not evidence (`docs/design/answer-grammar.md`, rule 2) and there is
no state it could honestly decay into — *it has been a while* is not evidence
of done and not evidence of failed. So a leaked handle keeps answering "still
working" and stays visible in [Session.openWork](/api/index/classes/Session#openwork) for the session's life,
by design: the row says what the app last told it, and nothing here invents an
ending it was never given.

## Properties

### workId

> `readonly` **workId**: `string`

Defined in: [src/atom/types.ts:1116](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1116)

This row's id — the same string [WorkRow.workId](/api/index/interfaces/WorkRow#workid) carries.

## Methods

### done()

> **done**(`error?`): `void`

Defined in: [src/atom/types.ts:1129](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1129)

Close the row. FIRST CLOSE WINS; a second call does nothing.

`error` is the app's own object for work that ended badly, and it is
recorded on the WORK ROW ONLY. It settles nothing, rejects nothing and
rewords no transition: closing a row is bookkeeping about WORK, never a
verdict about a FIRE. The doors that settle one are exactly the doors that
always did — throw from the handler, return `{ ok: false }`
([FireResult](/api/index/type-aliases/FireResult)), or call [Session.reject](/api/index/classes/Session#reject). A `done()` that
resolved a settlement latch would fork first-settlement-wins and launder an
app's claim about its own bookkeeping into the receipt for an action.

#### Parameters

##### error?

`unknown`

#### Returns

`void`
