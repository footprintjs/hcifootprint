---
title: Affordance
---

# Interface: Affordance

Defined in: [src/atom/types.ts:740](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L740)

## Properties

### binding?

> `optional` **binding?**: [`Binding`](/api/index/type-aliases/Binding)

Defined in: [src/atom/types.ts:749](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L749)

Optional since D18: a spine tool may exist with only its description
(plannable/tour-able) and gain a binding or handler at mount time.
The v1 fluent builder still requires it at authoring.

***

### blockedBecause?

> `optional` **blockedBecause?**: [`BlockedBecause`](/api/index/interfaces/BlockedBecause) \| (() => [`BlockedBecause`](/api/index/interfaces/BlockedBecause) \| `undefined`)

Defined in: [src/atom/types.ts:784](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L784)

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

Defined in: [src/atom/types.ts:818](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L818)

Whether a second fire may overlap an unresolved first, compiled verbatim
from `ActionDef.concurrency`. Absent means `'parallel'` — what every release
before this one did. See [ConcurrencyPolicy](/api/index/interfaces/ConcurrencyPolicy).

***

### description

> **description**: `string`

Defined in: [src/atom/types.ts:743](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L743)

***

### descriptionSource?

> `optional` **descriptionSource?**: `"declared"` \| `"registration"`

Defined in: [src/atom/types.ts:826](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L826)

Where the planner-facing description came from. Both classes are
developer-AUTHORED source-code literals (the firewall holds either way);
the marker keeps the origin auditable. Default 'declared'.

***

### effect?

> `optional` **effect?**: [`Effect`](/api/index/interfaces/Effect)

Defined in: [src/atom/types.ts:751](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L751)

***

### enabledWhen?

> `optional` **enabledWhen?**: [`WhereFilter`](/api/index/type-aliases/WhereFilter)\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/atom/types.ts:772](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L772)

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

Defined in: [src/atom/types.ts:812](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L812)

This control's own freshness answers, compiled verbatim from
`ActionDef.freshness`. Absent means the session default answers for it, and
an unanswered axis is `'disclose'` — today's behaviour. See
[FreshnessPolicy](/api/index/interfaces/FreshnessPolicy).

***

### guard?

> `optional` **guard?**: [`WhereFilter`](/api/index/type-aliases/WhereFilter)\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/atom/types.ts:750](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L750)

***

### highEffect

> **highEffect**: `boolean`

Defined in: [src/atom/types.ts:819](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L819)

***

### humanDecides?

> `optional` **humanDecides?**: [`HumanDecides`](/api/index/interfaces/HumanDecides)

Defined in: [src/atom/types.ts:791](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L791)

The app's declaration that this control's DECISION belongs to a person,
compiled verbatim from `ActionDef.humanDecides` at either authoring door.
See [HumanDecides](/api/index/interfaces/HumanDecides). Absent means no ownership was declared — never
"the agent's to make", which the library cannot know.

***

### id

> **id**: `string`

Defined in: [src/atom/types.ts:741](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L741)

***

### noInput?

> `optional` **noInput?**: `true`

Defined in: [src/atom/types.ts:760](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L760)

True when the author declared `'none'`: this action takes NO input, and a
caller sending one is refused. Compiled as a FLAG with `schema` left
undefined — deliberately not a synthetic empty schema, so every surface
that branches on "no schema declared" (MCP's no-params arm, the fire-time
shape gate) stays byte-identical to what it was.

***

### observability?

> `optional` **observability?**: [`Observability`](/api/index/type-aliases/Observability)

Defined in: [src/atom/types.ts:805](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L805)

How this action's effect can be SEEN, compiled verbatim from
`ActionDef.observability` at either authoring door. See
[Observability](/api/index/type-aliases/Observability). Absent means the app did not say — and under
[EffectPolicy](/api/index/interfaces/EffectPolicy) that absence is what a high-effect fire is refused for.

***

### on

> **on**: `string`[]

Defined in: [src/atom/types.ts:742](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L742)

***

### principalPolicy?

> `optional` **principalPolicy?**: [`PrincipalPolicy`](/api/index/interfaces/PrincipalPolicy)

Defined in: [src/atom/types.ts:798](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L798)

The app's declaration about WHO may perform this and whose choice it is,
compiled verbatim from `ActionDef.principalPolicy` at either authoring door.
See [PrincipalPolicy](/api/index/interfaces/PrincipalPolicy). Absent means nothing was declared — never
"anyone may", which the library cannot know.

***

### role

> **role**: [`CanonicalRole`](/api/index/type-aliases/CanonicalRole)

Defined in: [src/atom/types.ts:820](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L820)

***

### schema?

> `optional` **schema?**: `unknown`

Defined in: [src/atom/types.ts:752](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L752)

***

### verify?

> `optional` **verify?**: [`VerifyContract`](/api/index/type-aliases/VerifyContract)

Defined in: [src/atom/types.ts:762](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L762)

The app's own post-settlement check that this action really happened.
