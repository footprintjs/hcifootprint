---
title: AvailableEdge
---

# Interface: AvailableEdge

Defined in: [src/atom/types.ts:653](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L653)

## Properties

### activation?

> `optional` **activation?**: [`ActivationLevel`](/api/index/type-aliases/ActivationLevel)

Defined in: [src/atom/types.ts:717](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L717)

Evidence level behind "this node is active" (see ActivationLevel).

***

### affordanceId

> **affordanceId**: `string`

Defined in: [src/atom/types.ts:654](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L654)

***

### binding?

> `optional` **binding?**: [`Binding`](/api/index/type-aliases/Binding)

Defined in: [src/atom/types.ts:710](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L710)

***

### busy?

> `optional` **busy?**: `string`

Defined in: [src/atom/types.ts:817](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L817)

THE THIRD STATE — the app says this control is WORKING RIGHT NOW, and the
value is the app's own label for it ('Saving…', 'Placing your order').

A control has three states a person can see and an agent could not: it is
clickable, it is switched off, or it is mid-flight — the spinner in the
button. Only the first two had a wire, so working looked exactly like broken
from here, and the two moves an agent makes about broken (re-fire it, or tell
the human it failed) are the two worst moves about working.

PRESENCE IS THE WHOLE CLAIM, like every other stamp on this row. A key means
the app said so. NO KEY MEANS THE LIBRARY DOES NOT KNOW — never "not busy":
an app that never wired this says nothing about any of its controls, and a
cheerful `busy: false` on all of them would be a claim about every session
that was never asked.

A STRING, AND ONLY A STRING. There is deliberately no boolean form: a flag
would leave the meaning to whoever renders it, and the serving layer would
have to author a sentence about a state only the app can describe — which is
the exact conflation this field exists to end. The label is the app's word,
carried as DATA, and it never enters an authored sentence, the facts block,
or `groundTruth()`.

THREE WIRES, mirroring `enabled`'s, so an app says it wherever it already
knows it: `busy:` at registration, `handle.setBusy(actionId, label)`, and a
live store's `LiveAction.busy`. There is deliberately NO declarative
`busyWhen` — a condition can prove a state, but it cannot author a label, and
a library-written label is a library-written meaning. Nothing is read off the
DOM either: no `aria-busy`, no spinner-hunting, the same sensor law `holds`
keeps for the same reason.

IT DOES NOT GATE THE FIRE. Busy is what the app SAID, not a door the app
shut: a control that is busy and not disabled still fires, because the
library never invents a gate an app did not declare. An app that means "and
do not let anyone press it" already has the wire that says so — disable it,
and the fire is refused as `TOOL_DISABLED` exactly as before.

THERE IS NO TIMER ON IT, EVER. Nothing in this library expires a busy label,
because a clock is not evidence (docs/design/answer-grammar.md, rule 2): a
long wait proves that waiting happened and nothing whatever about the work.
A busy that outlives anyone's patience is answered by the row still saying
busy and `did_it_work` still saying still-pending — and that pair is the
truth. THE CEILING BELONGS TO THE CALLER: stop waiting whenever you like, and
report UNFINISHED. Never done, never failed.

CAPPED, NOT REDACTED, and that is a stance rather than an oversight. The
label is authored-style app text, so it crosses under the same 200-character
law an app's error text crosses under (`src/serve/error-text.ts`) — but it is
a bare string, and a redaction path names a field INSIDE a value, so there is
nothing here for `redactedFields` to name (the same honest limit `holds`
already documents above). Write labels a stranger may read: never interpolate
a secret, a customer's name, or the payload into one.

***

### description

> **description**: `string`

Defined in: [src/atom/types.ts:655](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L655)

***

### descriptionSource?

> `optional` **descriptionSource?**: `"declared"` \| `"registration"`

Defined in: [src/atom/types.ts:712](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L712)

See Affordance.descriptionSource.

***

### enabled?

> `optional` **enabled?**: `boolean`

Defined in: [src/atom/types.ts:732](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L732)

False when the app says the control is currently DISABLED (a grey button:
on screen, not clickable). Served honestly with the marker — like a human
seeing it — and firing it is a typed TOOL_DISABLED rejection.

FOUR wires land here, so an app can say it wherever it already knows it:
`enabled:` at registration, `handle.setEnabled(…)`, a live store's
`LiveAction.enabled`, and the declarative `ActionDef.enabledWhen`.

***

### enumeration?

> `optional` **enumeration?**: `"selector"` \| `"mounted-window"`

Defined in: [src/atom/types.ts:825](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L825)

Where `instances` came from: 'selector' = the declared existence source
(complete), 'mounted-window' = only what is mounted right now (partial —
stated, not silently presented as complete).

***

### evidence

> **evidence**: `FilterCondition`[]

Defined in: [src/atom/types.ts:665](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L665)

Per-condition guard evidence (key/op/threshold/actual) — why it is passable.

***

### expects?

> `optional` **expects?**: `unknown`

Defined in: [src/atom/types.ts:695](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L695)

What a caller must SEND, wire-shaped: zod normalized, a plain JSON Schema
detached, a non-serializable validator named in one authored sentence, and
the literal `'none'` for an action that takes no input. Absent means the
library does not know the shape — never "send nothing".

Identical to what Mode B's results have always served as `expects`, from
one shared derivation, because a consumer reading available() directly was
otherwise made to re-derive library law (which kinds serialize, which
decline) by hand. The residual asymmetry is deliberate and stated: this
surface carries BOTH the live validator and the wire contract; a served
result carries only the wire contract. A live validator never crosses the
wire — that is the firewall.

Shared and deep-frozen: one rendered contract reaches every caller, the
same stance `binding` takes above.

***

### guardUnevaluated?

> `optional` **guardUnevaluated?**: `string`[]

Defined in: [src/atom/types.ts:672](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L672)

Guard keys absent from the session's state view (or holding undefined —
a value guard like `ne ''` would match undefined, so an unset value is
unevaluable, not passable) — the edge is served anyway, WITH this
marker, instead of being silently hidden (D18 fix).

***

### highEffect

> **highEffect**: `boolean`

Defined in: [src/atom/types.ts:696](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L696)

***

### holds?

> `optional` **holds?**: `unknown`

Defined in: [src/atom/types.ts:763](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L763)

WHAT THIS CONTROL HOLDS RIGHT NOW — the draft in the box, the option
currently selected — read at the moment the row is assembled.

A READING, NEVER A BINDING. The fire still reads its own payload at act
time: `holds` says what the control had when the row was served, and a human
typing between the two makes the row stale by design. So it is a fact about
the app's state one turn early, and firing does not send it.

TWO WIRES land here, and only where the app already holds the value in a
variable: `holds:` at registration ([RegisterActionGroupOptions](/api/index/interfaces/RegisterActionGroupOptions)), and
the sensor forwarding a declared control's `value()` getter. The sensor's
per-element declaration wins when both exist — most specific, the same
declaration-outranks rule the sensor's own two evidence levels follow.

ABSENCE IS THE DEFAULT AND IT IS HONEST. No reader declared, a reader that
answers `undefined`, a reader that throws, an action whose contract is the
author's `'none'`, a row standing for many rows of a repeats container: each
one serves NO KEY rather than a guess. Nothing is ever read off the DOM —
that is the sensor's law (`sensor/payload.ts`), and it holds here for the
same reason: a plausible-looking wrong value is the worst thing this library
can ship.

REDACTED like the payload it will become, through `redactedFields.payload`
— what a control holds IS the future fire's payload one turn early, and a
field hidden from the log that still rides the card is not hidden. Same dot
paths, same `'[REDACTED]'` marker, same honest limit: a path names a field
inside a value, so a control holding a bare string is named the same way it
is on the record, which is to say it cannot be.

***

### instances?

> `optional` **instances?**: `string`[]

Defined in: [src/atom/types.ts:819](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L819)

Live instance keys for a repeats-container tool (runtime DATA, never schema).

***

### materialized?

> `optional` **materialized?**: `boolean`

Defined in: [src/atom/types.ts:663](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L663)

Present only when the session has live registrations: true = a handler is
mounted right now (fireable-with-execution), false = declared here but
nothing registered it (plannable; firing records but nothing executes —
on the current page this doubles as live binding-drift telemetry).

***

### navigatesTo?

> `optional` **navigatesTo?**: `string`

Defined in: [src/atom/types.ts:709](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L709)

The page this edge CLAIMS it will move you to (from `effect.navigatesTo`),
BEFORE anything is fired. Absent when the app declared none — never a
guessed destination.

A CLAIM about the app's handler, exactly as [ConfirmWillDo.navigatesTo](/api/index/interfaces/ConfirmWillDo#navigatesto)
is on the receipt a human reads. The human already had this fact at decision
time and the agent did not, which left the agent unable to know that this
edge's success evidence is PAGE MOTION rather than an element surviving:
a navigation declares no writes, so "nothing changed here" is what success
looks like from the element's side.

***

### node?

> `optional` **node?**: `string`

Defined in: [src/atom/types.ts:715](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L715)

Owning node path in the navigation tree (e.g. 'catalog.filter-rail').

***

### presence?

> `optional` **presence?**: `"unknown"`

Defined in: [src/atom/types.ts:722](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L722)

'unknown' when several exclusive-tab siblings are mounted and no
visibility wire exists — a flagged union, never a guessed winner.

***

### role

> **role**: [`CanonicalRole`](/api/index/type-aliases/CanonicalRole)

Defined in: [src/atom/types.ts:656](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L656)

***

### schema?

> `optional` **schema?**: `unknown`

Defined in: [src/atom/types.ts:677](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L677)

The LIVE validator, exactly as authored — an in-process convenience, and
the reason `expects` exists beside it. Absent when nothing was declared.
