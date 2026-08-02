---
title: Affordance
---

# Interface: Affordance

Defined in: [src/atom/types.ts:211](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L211)

## Properties

### binding?

> `optional` **binding?**: [`Binding`](/api/index/type-aliases/Binding)

Defined in: [src/atom/types.ts:220](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L220)

Optional since D18: a spine tool may exist with only its description
(plannable/tour-able) and gain a binding or handler at mount time.
The v1 fluent builder still requires it at authoring.

***

### description

> **description**: `string`

Defined in: [src/atom/types.ts:214](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L214)

***

### descriptionSource?

> `optional` **descriptionSource?**: `"declared"` \| `"registration"`

Defined in: [src/atom/types.ts:251](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L251)

Where the planner-facing description came from. Both classes are
developer-AUTHORED source-code literals (the firewall holds either way);
the marker keeps the origin auditable. Default 'declared'.

***

### effect?

> `optional` **effect?**: [`Effect`](/api/index/interfaces/Effect)

Defined in: [src/atom/types.ts:222](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L222)

***

### enabledWhen?

> `optional` **enabledWhen?**: [`WhereFilter`](/api/index/type-aliases/WhereFilter)\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/atom/types.ts:243](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L243)

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

Defined in: [src/atom/types.ts:221](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L221)

***

### highEffect

> **highEffect**: `boolean`

Defined in: [src/atom/types.ts:244](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L244)

***

### id

> **id**: `string`

Defined in: [src/atom/types.ts:212](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L212)

***

### noInput?

> `optional` **noInput?**: `true`

Defined in: [src/atom/types.ts:231](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L231)

True when the author declared `'none'`: this action takes NO input, and a
caller sending one is refused. Compiled as a FLAG with `schema` left
undefined — deliberately not a synthetic empty schema, so every surface
that branches on "no schema declared" (MCP's no-params arm, the fire-time
shape gate) stays byte-identical to what it was.

***

### on

> **on**: `string`[]

Defined in: [src/atom/types.ts:213](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L213)

***

### role

> **role**: [`CanonicalRole`](/api/index/type-aliases/CanonicalRole)

Defined in: [src/atom/types.ts:245](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L245)

***

### schema?

> `optional` **schema?**: `unknown`

Defined in: [src/atom/types.ts:223](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L223)

***

### verify?

> `optional` **verify?**: [`VerifyContract`](/api/index/type-aliases/VerifyContract)

Defined in: [src/atom/types.ts:233](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L233)

The app's own post-settlement check that this action really happened.
