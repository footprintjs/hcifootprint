---
title: Affordance
---

# Interface: Affordance

Defined in: [src/atom/types.ts:233](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L233)

## Properties

### binding?

> `optional` **binding?**: [`Binding`](/api/index/type-aliases/Binding)

Defined in: [src/atom/types.ts:242](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L242)

Optional since D18: a spine tool may exist with only its description
(plannable/tour-able) and gain a binding or handler at mount time.
The v1 fluent builder still requires it at authoring.

***

### description

> **description**: `string`

Defined in: [src/atom/types.ts:236](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L236)

***

### descriptionSource?

> `optional` **descriptionSource?**: `"declared"` \| `"registration"`

Defined in: [src/atom/types.ts:273](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L273)

Where the planner-facing description came from. Both classes are
developer-AUTHORED source-code literals (the firewall holds either way);
the marker keeps the origin auditable. Default 'declared'.

***

### effect?

> `optional` **effect?**: [`Effect`](/api/index/interfaces/Effect)

Defined in: [src/atom/types.ts:244](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L244)

***

### enabledWhen?

> `optional` **enabledWhen?**: `WhereFilter`\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/atom/types.ts:265](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L265)

Declarative DISABLEDNESS — distinct from `guard`, which decides whether the
edge exists here at all. A failed guard HIDES the edge; a false
`enabledWhen` SERVES it carrying `enabled: false` (a greyed button an agent
can see) and refuses an execution fire as TOOL_DISABLED. Authored via
`ToolDef.enabledWhen`, ideally from the same expression that renders
`<button disabled={…}>`. Keys it cannot evaluate never disable anything:
the library does not guess a control greyed out.

***

### guard?

> `optional` **guard?**: `WhereFilter`\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/atom/types.ts:243](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L243)

***

### highEffect

> **highEffect**: `boolean`

Defined in: [src/atom/types.ts:266](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L266)

***

### id

> **id**: `string`

Defined in: [src/atom/types.ts:234](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L234)

***

### noInput?

> `optional` **noInput?**: `true`

Defined in: [src/atom/types.ts:253](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L253)

True when the author declared `'none'`: this action takes NO input, and a
caller sending one is refused. Compiled as a FLAG with `schema` left
undefined — deliberately not a synthetic empty schema, so every surface
that branches on "no schema declared" (MCP's no-params arm, the fire-time
shape gate) stays byte-identical to what it was.

***

### on

> **on**: `string`[]

Defined in: [src/atom/types.ts:235](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L235)

***

### role

> **role**: [`CanonicalRole`](/api/index/type-aliases/CanonicalRole)

Defined in: [src/atom/types.ts:267](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L267)

***

### schema?

> `optional` **schema?**: `unknown`

Defined in: [src/atom/types.ts:245](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L245)

***

### verify?

> `optional` **verify?**: [`VerifyContract`](/api/index/type-aliases/VerifyContract)

Defined in: [src/atom/types.ts:255](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L255)

The app's own post-settlement check that this action really happened.
