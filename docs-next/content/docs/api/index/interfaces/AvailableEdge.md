---
title: AvailableEdge
---

# Interface: AvailableEdge

Defined in: [src/atom/types.ts:636](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L636)

## Properties

### activation?

> `optional` **activation?**: [`ActivationLevel`](/api/index/type-aliases/ActivationLevel)

Defined in: [src/atom/types.ts:700](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L700)

Evidence level behind "this node is active" (see ActivationLevel).

***

### affordanceId

> **affordanceId**: `string`

Defined in: [src/atom/types.ts:637](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L637)

***

### binding?

> `optional` **binding?**: [`Binding`](/api/index/type-aliases/Binding)

Defined in: [src/atom/types.ts:693](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L693)

***

### description

> **description**: `string`

Defined in: [src/atom/types.ts:638](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L638)

***

### descriptionSource?

> `optional` **descriptionSource?**: `"declared"` \| `"registration"`

Defined in: [src/atom/types.ts:695](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L695)

See Affordance.descriptionSource.

***

### enabled?

> `optional` **enabled?**: `boolean`

Defined in: [src/atom/types.ts:715](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L715)

False when the app says the control is currently DISABLED (a grey button:
on screen, not clickable). Served honestly with the marker — like a human
seeing it — and firing it is a typed TOOL_DISABLED rejection.

FOUR wires land here, so an app can say it wherever it already knows it:
`enabled:` at registration, `handle.setEnabled(…)`, a live store's
`LiveAction.enabled`, and the declarative `ToolDef.enabledWhen`.

***

### enumeration?

> `optional` **enumeration?**: `"selector"` \| `"mounted-window"`

Defined in: [src/atom/types.ts:754](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L754)

Where `instances` came from: 'selector' = the declared existence source
(complete), 'mounted-window' = only what is mounted right now (partial —
stated, not silently presented as complete).

***

### evidence

> **evidence**: `FilterCondition`[]

Defined in: [src/atom/types.ts:648](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L648)

Per-condition guard evidence (key/op/threshold/actual) — why it is passable.

***

### expects?

> `optional` **expects?**: `unknown`

Defined in: [src/atom/types.ts:678](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L678)

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

Defined in: [src/atom/types.ts:655](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L655)

Guard keys absent from the session's state view (or holding undefined —
a value guard like `ne ''` would match undefined, so an unset value is
unevaluable, not passable) — the edge is served anyway, WITH this
marker, instead of being silently hidden (D18 fix).

***

### highEffect

> **highEffect**: `boolean`

Defined in: [src/atom/types.ts:679](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L679)

***

### holds?

> `optional` **holds?**: `unknown`

Defined in: [src/atom/types.ts:746](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L746)

WHAT THIS CONTROL HOLDS RIGHT NOW — the draft in the box, the option
currently selected — read at the moment the row is assembled.

A READING, NEVER A BINDING. The fire still reads its own payload at act
time: `holds` says what the control had when the row was served, and a human
typing between the two makes the row stale by design. So it is a fact about
the app's state one turn early, and firing does not send it.

TWO WIRES land here, and only where the app already holds the value in a
variable: `holds:` at registration ([RegisterToolGroupOptions](/api/index/interfaces/RegisterToolGroupOptions)), and
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

Defined in: [src/atom/types.ts:748](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L748)

Live instance keys for a repeats-container tool (runtime DATA, never schema).

***

### materialized?

> `optional` **materialized?**: `boolean`

Defined in: [src/atom/types.ts:646](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L646)

Present only when the session has live registrations: true = a handler is
mounted right now (fireable-with-execution), false = declared here but
nothing registered it (plannable; firing records but nothing executes —
on the current page this doubles as live binding-drift telemetry).

***

### navigatesTo?

> `optional` **navigatesTo?**: `string`

Defined in: [src/atom/types.ts:692](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L692)

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

Defined in: [src/atom/types.ts:698](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L698)

Owning node path in the navigation tree (e.g. 'catalog.filter-rail').

***

### presence?

> `optional` **presence?**: `"unknown"`

Defined in: [src/atom/types.ts:705](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L705)

'unknown' when several exclusive-tab siblings are mounted and no
visibility wire exists — a flagged union, never a guessed winner.

***

### role

> **role**: [`CanonicalRole`](/api/index/type-aliases/CanonicalRole)

Defined in: [src/atom/types.ts:639](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L639)

***

### schema?

> `optional` **schema?**: `unknown`

Defined in: [src/atom/types.ts:660](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L660)

The LIVE validator, exactly as authored — an in-process convenience, and
the reason `expects` exists beside it. Absent when nothing was declared.
