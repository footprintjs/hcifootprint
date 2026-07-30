---
title: AvailableEdge
---

# Interface: AvailableEdge

Defined in: [src/atom/types.ts:534](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L534)

## Properties

### activation?

> `optional` **activation?**: [`ActivationLevel`](/api/index/type-aliases/ActivationLevel)

Defined in: [src/atom/types.ts:585](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L585)

Evidence level behind "this node is active" (see ActivationLevel).

***

### affordanceId

> **affordanceId**: `string`

Defined in: [src/atom/types.ts:535](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L535)

***

### binding?

> `optional` **binding?**: [`Binding`](/api/index/type-aliases/Binding)

Defined in: [src/atom/types.ts:578](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L578)

***

### description

> **description**: `string`

Defined in: [src/atom/types.ts:536](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L536)

***

### descriptionSource?

> `optional` **descriptionSource?**: `"declared"` \| `"registration"`

Defined in: [src/atom/types.ts:580](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L580)

See Affordance.descriptionSource.

***

### enabled?

> `optional` **enabled?**: `boolean`

Defined in: [src/atom/types.ts:600](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L600)

False when the app says the control is currently DISABLED (a grey button:
on screen, not clickable). Served honestly with the marker — like a human
seeing it — and firing it is a typed TOOL_DISABLED rejection.

FOUR wires land here, so an app can say it wherever it already knows it:
`enabled:` at registration, `handle.setEnabled(…)`, a live store's
`LiveAction.enabled`, and the declarative `ToolDef.enabledWhen`.

***

### enumeration?

> `optional` **enumeration?**: `"selector"` \| `"mounted-window"`

Defined in: [src/atom/types.ts:608](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L608)

Where `instances` came from: 'selector' = the declared existence source
(complete), 'mounted-window' = only what is mounted right now (partial —
stated, not silently presented as complete).

***

### evidence

> **evidence**: `FilterCondition`[]

Defined in: [src/atom/types.ts:546](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L546)

Per-condition guard evidence (key/op/threshold/actual) — why it is passable.

***

### expects?

> `optional` **expects?**: `unknown`

Defined in: [src/atom/types.ts:576](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L576)

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

Defined in: [src/atom/types.ts:553](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L553)

Guard keys absent from the session's state view (or holding undefined —
a value guard like `ne ''` would match undefined, so an unset value is
unevaluable, not passable) — the edge is served anyway, WITH this
marker, instead of being silently hidden (D18 fix).

***

### highEffect

> **highEffect**: `boolean`

Defined in: [src/atom/types.ts:577](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L577)

***

### instances?

> `optional` **instances?**: `string`[]

Defined in: [src/atom/types.ts:602](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L602)

Live instance keys for a repeats-container tool (runtime DATA, never schema).

***

### materialized?

> `optional` **materialized?**: `boolean`

Defined in: [src/atom/types.ts:544](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L544)

Present only when the session has live registrations: true = a handler is
mounted right now (fireable-with-execution), false = declared here but
nothing registered it (plannable; firing records but nothing executes —
on the current page this doubles as live binding-drift telemetry).

***

### node?

> `optional` **node?**: `string`

Defined in: [src/atom/types.ts:583](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L583)

Owning node path in the navigation tree (e.g. 'catalog.filter-rail').

***

### presence?

> `optional` **presence?**: `"unknown"`

Defined in: [src/atom/types.ts:590](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L590)

'unknown' when several exclusive-tab siblings are mounted and no
visibility wire exists — a flagged union, never a guessed winner.

***

### role

> **role**: [`CanonicalRole`](/api/index/type-aliases/CanonicalRole)

Defined in: [src/atom/types.ts:537](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L537)

***

### schema?

> `optional` **schema?**: `unknown`

Defined in: [src/atom/types.ts:558](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L558)

The LIVE validator, exactly as authored — an in-process convenience, and
the reason `expects` exists beside it. Absent when nothing was declared.
