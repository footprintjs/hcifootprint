---
title: Affordance
---

# Interface: Affordance

Defined in: [src/atom/types.ts:744](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L744)

## Properties

### binding?

> `optional` **binding?**: [`Binding`](/api/index/type-aliases/Binding)

Defined in: [src/atom/types.ts:753](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L753)

Optional since D18: a spine tool may exist with only its description
(plannable/tour-able) and gain a binding or handler at mount time.
The v1 fluent builder still requires it at authoring.

***

### blockedBecause?

> `optional` **blockedBecause?**: [`BlockedBecause`](/api/index/interfaces/BlockedBecause) \| (() => [`BlockedBecause`](/api/index/interfaces/BlockedBecause) \| `undefined`)

Defined in: [src/atom/types.ts:788](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L788)

The app's own reason this control is off, compiled from
`ActionDef.blockedBecause` at either authoring door. The OBJECT form is
owned by the graph (cloned, frozen); the FUNCTION form stays by reference,
because it is code — like a validator, and like the value reader `holds`
takes — and is called fresh at every row assembly.

Served ONLY while the row is `enabled: false` (see
[AvailableEdge.blockedBecause](/api/index/interfaces/AvailableEdge#blockedbecause)). Declaring it changes nothing about a
live control.

***

### concurrency?

> `optional` **concurrency?**: [`ConcurrencyPolicy`](/api/index/interfaces/ConcurrencyPolicy)

Defined in: [src/atom/types.ts:822](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L822)

Whether a second fire may overlap an unresolved first, compiled verbatim
from `ActionDef.concurrency`. Absent means `'parallel'` — what every release
before this one did. See [ConcurrencyPolicy](/api/index/interfaces/ConcurrencyPolicy).

***

### description

> **description**: `string`

Defined in: [src/atom/types.ts:747](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L747)

***

### descriptionSource?

> `optional` **descriptionSource?**: `"declared"` \| `"registration"`

Defined in: [src/atom/types.ts:830](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L830)

Where the planner-facing description came from. Both classes are
developer-AUTHORED source-code literals (the firewall holds either way);
the marker keeps the origin auditable. Default 'declared'.

***

### effect?

> `optional` **effect?**: [`Effect`](/api/index/interfaces/Effect)

Defined in: [src/atom/types.ts:755](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L755)

***

### enabledWhen?

> `optional` **enabledWhen?**: [`WhereFilter`](/api/index/type-aliases/WhereFilter)\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/atom/types.ts:776](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L776)

Declarative DISABLEDNESS — distinct from `guard`, which decides whether the
edge exists here at all. A failed guard HIDES the edge; a false
`enabledWhen` SERVES it carrying `enabled: false` (a greyed button an agent
can see) and refuses an execution fire as TOOL_DISABLED. Authored via
`ActionDef.enabledWhen`, ideally from the same expression that renders
`<button disabled={…}>`. Keys it cannot evaluate never disable anything:
the library does not guess a control greyed out.

***

### freshness?

> `optional` **freshness?**: [`FreshnessPolicy`](/api/index/interfaces/FreshnessPolicy)

Defined in: [src/atom/types.ts:816](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L816)

This control's own freshness answers, compiled verbatim from
`ActionDef.freshness`. Absent means the session default answers for it, and
an unanswered axis is `'disclose'` — today's behaviour. See
[FreshnessPolicy](/api/index/interfaces/FreshnessPolicy).

***

### guard?

> `optional` **guard?**: [`WhereFilter`](/api/index/type-aliases/WhereFilter)\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/atom/types.ts:754](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L754)

***

### highEffect

> **highEffect**: `boolean`

Defined in: [src/atom/types.ts:823](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L823)

***

### humanDecides?

> `optional` **humanDecides?**: [`HumanDecides`](/api/index/interfaces/HumanDecides)

Defined in: [src/atom/types.ts:795](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L795)

The app's declaration that this control's DECISION belongs to a person,
compiled verbatim from `ActionDef.humanDecides` at either authoring door.
See [HumanDecides](/api/index/interfaces/HumanDecides). Absent means no ownership was declared — never
"the agent's to make", which the library cannot know.

***

### id

> **id**: `string`

Defined in: [src/atom/types.ts:745](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L745)

***

### noInput?

> `optional` **noInput?**: `true`

Defined in: [src/atom/types.ts:764](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L764)

True when the author declared `'none'`: this action takes NO input, and a
caller sending one is refused. Compiled as a FLAG with `schema` left
undefined — deliberately not a synthetic empty schema, so every surface
that branches on "no schema declared" (MCP's no-params arm, the fire-time
shape gate) stays byte-identical to what it was.

***

### observability?

> `optional` **observability?**: [`Observability`](/api/index/type-aliases/Observability)

Defined in: [src/atom/types.ts:809](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L809)

How this action's effect can be SEEN, compiled verbatim from
`ActionDef.observability` at either authoring door. See
[Observability](/api/index/type-aliases/Observability). Absent means the app did not say — and under
[EffectPolicy](/api/index/interfaces/EffectPolicy) that absence is what a high-effect fire is refused for.

***

### on

> **on**: `string`[]

Defined in: [src/atom/types.ts:746](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L746)

***

### principalPolicy?

> `optional` **principalPolicy?**: [`PrincipalPolicy`](/api/index/interfaces/PrincipalPolicy)

Defined in: [src/atom/types.ts:802](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L802)

The app's declaration about WHO may perform this and whose choice it is,
compiled verbatim from `ActionDef.principalPolicy` at either authoring door.
See [PrincipalPolicy](/api/index/interfaces/PrincipalPolicy). Absent means nothing was declared — never
"anyone may", which the library cannot know.

***

### role

> **role**: [`CanonicalRole`](/api/index/type-aliases/CanonicalRole)

Defined in: [src/atom/types.ts:824](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L824)

***

### schema?

> `optional` **schema?**: `unknown`

Defined in: [src/atom/types.ts:756](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L756)

***

### verify?

> `optional` **verify?**: [`VerifyContract`](/api/index/type-aliases/VerifyContract)

Defined in: [src/atom/types.ts:766](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L766)

The app's own post-settlement check that this action really happened.
