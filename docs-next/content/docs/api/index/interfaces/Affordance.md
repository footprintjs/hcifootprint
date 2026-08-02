---
title: Affordance
---

# Interface: Affordance

Defined in: [src/atom/types.ts:352](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L352)

## Properties

### binding?

> `optional` **binding?**: [`Binding`](/api/index/type-aliases/Binding)

Defined in: [src/atom/types.ts:361](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L361)

Optional since D18: a spine tool may exist with only its description
(plannable/tour-able) and gain a binding or handler at mount time.
The v1 fluent builder still requires it at authoring.

***

### blockedBecause?

> `optional` **blockedBecause?**: [`BlockedBecause`](/api/index/interfaces/BlockedBecause) \| (() => [`BlockedBecause`](/api/index/interfaces/BlockedBecause) \| `undefined`)

Defined in: [src/atom/types.ts:396](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L396)

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

Defined in: [src/atom/types.ts:355](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L355)

***

### descriptionSource?

> `optional` **descriptionSource?**: `"declared"` \| `"registration"`

Defined in: [src/atom/types.ts:411](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L411)

Where the planner-facing description came from. Both classes are
developer-AUTHORED source-code literals (the firewall holds either way);
the marker keeps the origin auditable. Default 'declared'.

***

### effect?

> `optional` **effect?**: [`Effect`](/api/index/interfaces/Effect)

Defined in: [src/atom/types.ts:363](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L363)

***

### enabledWhen?

> `optional` **enabledWhen?**: [`WhereFilter`](/api/index/type-aliases/WhereFilter)\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/atom/types.ts:384](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L384)

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

Defined in: [src/atom/types.ts:362](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L362)

***

### highEffect

> **highEffect**: `boolean`

Defined in: [src/atom/types.ts:404](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L404)

***

### humanDecides?

> `optional` **humanDecides?**: [`HumanDecides`](/api/index/interfaces/HumanDecides)

Defined in: [src/atom/types.ts:403](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L403)

The app's declaration that this control's DECISION belongs to a person,
compiled verbatim from `ActionDef.humanDecides` at either authoring door.
See [HumanDecides](/api/index/interfaces/HumanDecides). Absent means no ownership was declared — never
"the agent's to make", which the library cannot know.

***

### id

> **id**: `string`

Defined in: [src/atom/types.ts:353](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L353)

***

### noInput?

> `optional` **noInput?**: `true`

Defined in: [src/atom/types.ts:372](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L372)

True when the author declared `'none'`: this action takes NO input, and a
caller sending one is refused. Compiled as a FLAG with `schema` left
undefined — deliberately not a synthetic empty schema, so every surface
that branches on "no schema declared" (MCP's no-params arm, the fire-time
shape gate) stays byte-identical to what it was.

***

### on

> **on**: `string`[]

Defined in: [src/atom/types.ts:354](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L354)

***

### role

> **role**: [`CanonicalRole`](/api/index/type-aliases/CanonicalRole)

Defined in: [src/atom/types.ts:405](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L405)

***

### schema?

> `optional` **schema?**: `unknown`

Defined in: [src/atom/types.ts:364](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L364)

***

### verify?

> `optional` **verify?**: [`VerifyContract`](/api/index/type-aliases/VerifyContract)

Defined in: [src/atom/types.ts:374](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L374)

The app's own post-settlement check that this action really happened.
