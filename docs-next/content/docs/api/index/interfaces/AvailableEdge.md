---
title: AvailableEdge
---

# Interface: AvailableEdge

Defined in: [src/atom/types.ts:411](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L411)

## Properties

### activation?

> `optional` **activation?**: [`ActivationLevel`](/api/index/type-aliases/ActivationLevel)

Defined in: [src/atom/types.ts:440](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L440)

Evidence level behind "this node is active" (see ActivationLevel).

***

### affordanceId

> **affordanceId**: `string`

Defined in: [src/atom/types.ts:412](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L412)

***

### binding?

> `optional` **binding?**: [`Binding`](/api/index/type-aliases/Binding)

Defined in: [src/atom/types.ts:433](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L433)

***

### description

> **description**: `string`

Defined in: [src/atom/types.ts:413](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L413)

***

### descriptionSource?

> `optional` **descriptionSource?**: `"declared"` \| `"registration"`

Defined in: [src/atom/types.ts:435](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L435)

See Affordance.descriptionSource.

***

### enabled?

> `optional` **enabled?**: `boolean`

Defined in: [src/atom/types.ts:452](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L452)

False when the registration site said the control is currently DISABLED
(a grey button: on screen, not clickable). Served honestly with the
marker — like a human seeing it — and firing it is a typed TOOL_DISABLED
rejection. Set via ToolGroup.setEnabled / the `enabled` registration field.

***

### enumeration?

> `optional` **enumeration?**: `"selector"` \| `"mounted-window"`

Defined in: [src/atom/types.ts:460](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L460)

Where `instances` came from: 'selector' = the declared existence source
(complete), 'mounted-window' = only what is mounted right now (partial —
stated, not silently presented as complete).

***

### evidence

> **evidence**: `FilterCondition`[]

Defined in: [src/atom/types.ts:423](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L423)

Per-condition guard evidence (key/op/threshold/actual) — why it is passable.

***

### guardUnevaluated?

> `optional` **guardUnevaluated?**: `string`[]

Defined in: [src/atom/types.ts:430](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L430)

Guard keys absent from the session's state view (or holding undefined —
a value guard like `ne ''` would match undefined, so an unset value is
unevaluable, not passable) — the edge is served anyway, WITH this
marker, instead of being silently hidden (D18 fix).

***

### highEffect

> **highEffect**: `boolean`

Defined in: [src/atom/types.ts:432](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L432)

***

### instances?

> `optional` **instances?**: `string`[]

Defined in: [src/atom/types.ts:454](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L454)

Live instance keys for a repeats-container tool (runtime DATA, never schema).

***

### materialized?

> `optional` **materialized?**: `boolean`

Defined in: [src/atom/types.ts:421](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L421)

Present only when the session has live registrations: true = a handler is
mounted right now (fireable-with-execution), false = declared here but
nothing registered it (plannable; firing records but nothing executes —
on the current page this doubles as live binding-drift telemetry).

***

### node?

> `optional` **node?**: `string`

Defined in: [src/atom/types.ts:438](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L438)

Owning node path in the navigation tree (e.g. 'catalog.filter-rail').

***

### presence?

> `optional` **presence?**: `"unknown"`

Defined in: [src/atom/types.ts:445](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L445)

'unknown' when several exclusive-tab siblings are mounted and no
visibility wire exists — a flagged union, never a guessed winner.

***

### role

> **role**: [`CanonicalRole`](/api/index/type-aliases/CanonicalRole)

Defined in: [src/atom/types.ts:414](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L414)

***

### schema?

> `optional` **schema?**: `unknown`

Defined in: [src/atom/types.ts:431](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L431)
