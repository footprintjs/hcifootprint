---
title: FireOptions
---

# Interface: FireOptions

Defined in: [src/atom/types.ts:1037](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1037)

## Properties

### askId?

> `optional` **askId?**: `string`

Defined in: [src/atom/types.ts:1077](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1077)

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

Defined in: [src/atom/types.ts:1051](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1051)

Optimistic-concurrency token from available().version. If supplied and
stale, fire() rejects with STALE_CURSOR — the agent must replan on a
fresh slice. Guards are ALSO re-evaluated at fire time regardless.

***

### instance?

> `optional` **instance?**: `string`

Defined in: [src/atom/types.ts:1054](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1054)

Instance key for a tool on a repeats container (e.g. an order-card id).

***

### invoke?

> `optional` **invoke?**: `boolean`

Defined in: [src/atom/types.ts:1060](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1060)

Invoke the registered handler (default true when one exists). The DOM
sensor passes false: the browser already runs the app's own onClick, so
the sensor's fire() is record-only.

***

### payload?

> `optional` **payload?**: `unknown`

Defined in: [src/atom/types.ts:1052](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1052)

***

### source

> **source**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:1045](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1045)

Who is acting. Required here on purpose — a typed caller should never
leave provenance to an assumption. It is only ever assumed for a caller
the types never reached (plain JS): an omitted source reads as 'agent',
the same assumption `commitJourney()` and `confirmAsk()` publish, never as
'user' — a machine action must not enter the ledger as a human one.
