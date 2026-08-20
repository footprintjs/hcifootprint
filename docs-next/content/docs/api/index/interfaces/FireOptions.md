---
title: FireOptions
---

# Interface: FireOptions

Defined in: [src/atom/types.ts:1927](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1927)

## Properties

### acknowledgementId?

> `optional` **acknowledgementId?**: `string`

Defined in: [src/atom/types.ts:1997](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1997)

THE PROTOCOL STEP THIS FIRE PERFORMED — the `acknowledgementId` from
`session.acknowledgeStale()`, read only under a `'require-ack'` axis.

A pointer to a [StaleAcknowledgement](/api/index/interfaces/StaleAcknowledgement) row, on the same terms as
`askId` above: a citation, never a boolean the caller controls. It proves
the step was performed. It proves nothing whatsoever about comprehension,
and the record it points at says so in its own words.

***

### askId?

> `optional` **askId?**: `string`

Defined in: [src/atom/types.ts:1967](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1967)

The confirm-journal row that authorizes this fire — read only when the
session was created with [SessionOptions.requireHumanApproval](/api/index/interfaces/SessionOptions#requirehumanapproval). Pass
the `askId` your Approve control approved (the one that came back from
`confirmAsk`, or rode the needs-confirm result).

A POINTER, NEVER A SECRET. Ask ids are a per-session counter ('ask#1') and
are already handed to the model — guessing one is worthless, because the gate
requires a row for that id written by a door the model cannot write. Do not
treat it as a capability token; treat it as a citation.

AND NEVER A BOOLEAN. There is deliberately no `confirm` field here, and there
will not be one: a boolean the caller controls is not evidence, so the door
has no slot for one. `confirm: true` survives at the served boundary as what
it honestly always was — the agent asking to proceed now.

***

### expectedVersion?

> `optional` **expectedVersion?**: `number`

Defined in: [src/atom/types.ts:1941](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1941)

Optimistic-concurrency token from available().version. If supplied and
stale, fire() rejects with STALE_CURSOR — the agent must replan on a
fresh slice. Guards are ALSO re-evaluated at fire time regardless.

***

### instance?

> `optional` **instance?**: `string`

Defined in: [src/atom/types.ts:1944](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1944)

Instance key for a tool on a repeats container (e.g. an order-card id).

***

### invoke?

> `optional` **invoke?**: `boolean`

Defined in: [src/atom/types.ts:1950](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1950)

Invoke the registered handler (default true when one exists). The DOM
sensor passes false: the browser already runs the app's own onClick, so
the sensor's fire() is record-only.

***

### offerId?

> `optional` **offerId?**: `string`

Defined in: [src/atom/types.ts:1987](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1987)

THE ROW THIS FIRE WAS PLANNED AGAINST — the `offerId` from
[AvailableEdge.offerRef](/api/index/interfaces/AvailableEdge#offerref), or from the served action row when the
session's policy enforces something.

A CITATION TO A SESSION RECORD. Not a secret, not a capability token, not a
nonce: it names an [OfferRecord](/api/index/interfaces/OfferRecord) this session wrote and the model was
shown, and holding one grants nothing at all. Every gate that ran before
still runs. Its whole job is to let the library compare *what was true when
you were offered this* against *what is true now* — the comparison
`expectedVersion` could only approximate, because that number was supplied
by hand and tied to no row.

OPTIONAL, and it stays optional: with no freshness policy declared, citing
an offer changes not one byte of what happens (the id is recorded on the
transition and nothing else). Under a policy that enforces any axis, a fire
with no citation is refused `OFFER_REQUIRED` — you cannot judge a plan's
freshness against a plan you cannot identify.

***

### payload?

> `optional` **payload?**: `unknown`

Defined in: [src/atom/types.ts:1942](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1942)

***

### source

> **source**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:1935](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1935)

Who is acting. Required here on purpose — a typed caller should never
leave provenance to an assumption. It is only ever assumed for a caller
the types never reached (plain JS): an omitted source reads as 'agent',
the same assumption `commitJourney()` and `confirmAsk()` publish, never as
'user' — a machine action must not enter the ledger as a human one.
