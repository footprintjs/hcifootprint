---
title: Affordance
---

# Interface: Affordance

Defined in: [src/atom/types.ts:268](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L268)

## Properties

### binding?

> `optional` **binding?**: [`Binding`](/api/index/type-aliases/Binding)

Defined in: [src/atom/types.ts:277](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L277)

Optional since D18: a spine tool may exist with only its description
(plannable/tour-able) and gain a binding or handler at mount time.
The v1 fluent builder still requires it at authoring.

***

### blockedBecause?

> `optional` **blockedBecause?**: [`BlockedBecause`](/api/index/interfaces/BlockedBecause) \| (() => [`BlockedBecause`](/api/index/interfaces/BlockedBecause) \| `undefined`)

Defined in: [src/atom/types.ts:312](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L312)

The app's own reason this control is off, compiled from
`ActionDef.blockedBecause` at either authoring door. The OBJECT form is
owned by the graph (cloned, frozen); the FUNCTION form stays by reference,
because it is code — like a validator, and like the value reader `holds`
takes — and is called fresh at every row assembly.

Served ONLY while the row is `enabled: false` (see
[AvailableEdge.blockedBecause](/api/index/interfaces/AvailableEdge#blockedbecause)). Declaring it changes nothing about a
live control.

***

### description

> **description**: `string`

Defined in: [src/atom/types.ts:271](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L271)

***

### descriptionSource?

> `optional` **descriptionSource?**: `"declared"` \| `"registration"`

Defined in: [src/atom/types.ts:320](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L320)

Where the planner-facing description came from. Both classes are
developer-AUTHORED source-code literals (the firewall holds either way);
the marker keeps the origin auditable. Default 'declared'.

***

### effect?

> `optional` **effect?**: [`Effect`](/api/index/interfaces/Effect)

Defined in: [src/atom/types.ts:279](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L279)

***

### enabledWhen?

> `optional` **enabledWhen?**: [`WhereFilter`](/api/index/type-aliases/WhereFilter)\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/atom/types.ts:300](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L300)

Declarative DISABLEDNESS — distinct from `guard`, which decides whether the
edge exists here at all. A failed guard HIDES the edge; a false
`enabledWhen` SERVES it carrying `enabled: false` (a greyed button an agent
can see) and refuses an execution fire as TOOL_DISABLED. Authored via
`ActionDef.enabledWhen`, ideally from the same expression that renders
`<button disabled={…}>`. Keys it cannot evaluate never disable anything:
the library does not guess a control greyed out.

***

### guard?

> `optional` **guard?**: [`WhereFilter`](/api/index/type-aliases/WhereFilter)\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/atom/types.ts:278](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L278)

***

### highEffect

> **highEffect**: `boolean`

Defined in: [src/atom/types.ts:313](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L313)

***

### id

> **id**: `string`

Defined in: [src/atom/types.ts:269](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L269)

***

### noInput?

> `optional` **noInput?**: `true`

Defined in: [src/atom/types.ts:288](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L288)

True when the author declared `'none'`: this action takes NO input, and a
caller sending one is refused. Compiled as a FLAG with `schema` left
undefined — deliberately not a synthetic empty schema, so every surface
that branches on "no schema declared" (MCP's no-params arm, the fire-time
shape gate) stays byte-identical to what it was.

***

### on

> **on**: `string`[]

Defined in: [src/atom/types.ts:270](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L270)

***

### role

> **role**: [`CanonicalRole`](/api/index/type-aliases/CanonicalRole)

Defined in: [src/atom/types.ts:314](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L314)

***

### schema?

> `optional` **schema?**: `unknown`

Defined in: [src/atom/types.ts:280](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L280)

***

### verify?

> `optional` **verify?**: [`VerifyContract`](/api/index/type-aliases/VerifyContract)

Defined in: [src/atom/types.ts:290](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L290)

The app's own post-settlement check that this action really happened.
