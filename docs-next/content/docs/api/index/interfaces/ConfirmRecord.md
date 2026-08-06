---
title: ConfirmRecord
---

# Interface: ConfirmRecord

Defined in: [src/atom/types.ts:1845](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1845)

One row of the confirm journal: the auditable trail of high-effect asks and
how they were answered. A needs-confirm ask lands an `'ask'` row (carrying
its receipts); the human's answer lands `'approved'` (the confirmed fire,
linked by `transitionId`) or `'declined'`. The three rows of one gate share
an `askId`.

Kept SEPARATE from the gap ledger by design: a gated action is not unmet
demand — the capability exists, it awaited consent — so mixing the two would
poison the "what to build next" triage signal the gap ledger feeds. Rows are
token-lean and injection-safe (ids + structural facts; the only free text,
`note`, is length-capped, and `receipts` carries authored strings plus one
structured runtime DATA field, `willUse` — the input the human is shown).

`kind` GROWS, and a consumer should be written for that. Three words shipped in
0.6.0; [SessionOptions.requireHumanApproval](/api/index/interfaces/SessionOptions#requirehumanapproval) adds four, because the
library can now record facts it previously could not have: a human's ALLOW
standing on its own BEFORE any fire, a durable ALWAYS ALLOW, the moment an
approval was spent, and a crossing attempt that had no valid yes. What never
happens is a kind CHANGING meaning: every value keeps exactly what it had, and
a new one is always a new fact, never an old one relabelled.

WHY FOUR NEW KINDS AND NOT A `scope: 'once' | 'always'` FIELD. A new field is
silently ignored by a consumer that does not know it exists, so a DURABLE grant
would be counted as a one-time yes by every 0.6-era filter — and here being
missed is a security misreading, not a cosmetic one. A new kind is unmissable.
So read a row by the kind you know and let the rest fall through; an exhaustive
`never` check over the old three is the one consumer shape this stops
compiling.

## Properties

### affordanceId

> **affordanceId**: `string`

Defined in: [src/atom/types.ts:1869](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1869)

***

### askId

> **askId**: `string`

Defined in: [src/atom/types.ts:1868](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1868)

Links the ask → decision → fire rows of one high-effect gate. On an
`'always-approved'` row it is that policy's own id ('grant#1'), carried by
every `'used'` row the grant authorizes — so the journal shows how many times
a standing yes was exercised.

***

### by?

> `optional` **by?**: `string`

Defined in: [src/atom/types.ts:1889](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1889)

Who answered — an operator id, an email, your host's label. Optional.

***

### enforced?

> `optional` **enforced?**: `true`

Defined in: [src/atom/types.ts:1898](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1898)

Present (true) on every row the enforcement path wrote — so an auditor can
separate rows the gate will honour from the pre-enforcement journal's rows,
without inferring it from a kind.

***

### expiresAt?

> `optional` **expiresAt?**: `number`

Defined in: [src/atom/types.ts:1913](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1913)

When a standing grant stops authorizing (epoch ms). Absent = no time limit.

***

### kind

> **kind**: `"refused"` \| `"approved"` \| `"declined"` \| `"always-approved"` \| `"ask"` \| `"used"` \| `"revoked"`

Defined in: [src/atom/types.ts:1861](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1861)

- `'ask'`              — a high-effect gate opened; carries the receipts.
- `'approved'`         — a human's ALLOW. Single-use: one yes, one fire.
- `'always-approved'`  — a human's ALWAYS ALLOW: a scoped standing policy,
  never consumed, and deliberately NOT bound to an input (see `scopeInstance`).
- `'declined'`         — a no. From the human's own door ([Session.declineAsk](/api/index/classes/Session#declineask))
  it is terminal for that askId; any other decline under enforcement is a
  report that closes nothing, and says so with `relayed`.
- `'used'`             — an approval was SPENT by a fire (`transitionId`).
- `'refused'`          — a crossing attempt with no valid yes (`rejectionReason`).
- `'revoked'`          — a yes was withdrawn: a standing grant
  ([Session.revokeAlwaysApprove](/api/index/classes/Session#revokealwaysapprove)) or a single unspent approval
  ([Session.revokeAsk](/api/index/classes/Session#revokeask)). Always a NEW row referencing the askId —
  the answered row it withdraws is never rewritten.

***

### node

> **node**: `string`

Defined in: [src/atom/types.ts:1872](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1872)

***

### note?

> `optional` **note?**: `string`

Defined in: [src/atom/types.ts:1891](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1891)

Free-text note (length-capped). On a decline, typically why.

***

### principal

> **principal**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:1875](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1875)

Who asked ('ask'), or the principal that recorded the decision.

***

### receipts?

> `optional` **receipts?**: [`ConfirmReceipts`](/api/index/interfaces/ConfirmReceipts)

Defined in: [src/atom/types.ts:1878](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1878)

The receipts that rode this ask (present on 'ask' rows).

***

### rejectionReason?

> `optional` **rejectionReason?**: `"APPROVAL_REQUIRED"` \| `"APPROVAL_SPENT"` \| `"APPROVAL_MISMATCH"` \| `"APPROVAL_STALE"` \| `"APPROVAL_DECLINED"` \| `"APPROVAL_REVOKED"`

Defined in: [src/atom/types.ts:1921](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1921)

Why a crossing attempt was refused (`'refused'` rows) — joins the gap ledger.

***

### relayed?

> `optional` **relayed?**: `true`

Defined in: [src/atom/types.ts:1909](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1909)

Present (true) on a `'declined'` row that RELAYS a refusal instead of
recording the human's own decision — an agent's report, or any
[Session.declineConfirm](/api/index/classes/Session#declineconfirm) under enforcement. The ask it names is still
OPEN: nothing was closed, and `groundTruth()` keeps saying the person is
deciding. Without it an auditor would have to infer the difference from
`principal`, which on this row is the caller's claim rather than a fact — and
a fabricated no that reads like a real one is the same forgery as a
fabricated yes. A human's no (`declineAsk`) never carries this.

***

### scopeInstance?

> `optional` **scopeInstance?**: `string`

Defined in: [src/atom/types.ts:1911](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1911)

An ALWAYS ALLOW scoped to one row of a list (an order id). Absent = any instance.

***

### stateVersion?

> `optional` **stateVersion?**: `number`

Defined in: [src/atom/types.ts:1919](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1919)

The STATE version when the decision was recorded — the anchor for
[HumanApprovalPolicy.refuseWhenWorldMoved](/api/index/interfaces/HumanApprovalPolicy#refusewhenworldmoved). Stamped always; enforced
only when asked.

***

### timestamp

> **timestamp**: `number`

Defined in: [src/atom/types.ts:1871](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1871)

Epoch milliseconds when the row was recorded.

***

### transitionId?

> `optional` **transitionId?**: `string`

Defined in: [src/atom/types.ts:1886](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1886)

The TransitionRecord.id of the fire this row is about. Present on `'used'`
rows, and on a `'approved'` row written by the pre-enforcement default path
(where the fire IS what closed the ask). Deliberately ABSENT on an
`approveAsk` row: no fire has happened yet — that is the whole change.

***

### version

> **version**: `number`

Defined in: [src/atom/types.ts:1873](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1873)
