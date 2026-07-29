---
title: NavigationGraph<Paths>
---

# Interface: NavigationGraph\<Paths\>

Defined in: [src/tree/types.ts:211](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L211)

## Type Parameters

### Paths

`Paths` *extends* `string` = `string`

## Properties

### id

> **id**: `string`

Defined in: [src/tree/types.ts:212](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L212)

***

### nodes

> **nodes**: `Record`\<`string`, [`MapNode`](/api/index/interfaces/MapNode)\>

Defined in: [src/tree/types.ts:220](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L220)

Every node by path — pages included.

***

### spec

> **spec**: [`SkillGraphSpec`](/api/index/interfaces/SkillGraphSpec)

Defined in: [src/tree/types.ts:218](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L218)

The flat projection: a Session-compatible SkillGraphSpec whose affordance
ids are qualified dot paths and whose guards are the composed root→leaf
chains. A plain Session runs on it unchanged; InteractionSession adds the tree.

***

### toolNodes

> **toolNodes**: `Record`\<`string`, `string`[]\>

Defined in: [src/tree/types.ts:222](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L222)

Qualified tool id → the node path(s) it lives on (root tools list their pages).

## Methods

### createSession()

> **createSession**(`opts?`): [`InteractionSession`](/api/index/classes/InteractionSession)\<`Paths`\>

Defined in: [src/tree/types.ts:224](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L224)

Create a live interaction session; `Paths` carries the typed node paths through.

#### Parameters

##### opts?

[`InteractionSessionOptions`](/api/index/interfaces/InteractionSessionOptions)

#### Returns

[`InteractionSession`](/api/index/classes/InteractionSession)\<`Paths`\>

***

### requiredStateKeys()

> **requiredStateKeys**(): `string`[]

Defined in: [src/tree/types.ts:239](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L239)

The sorted, deduped set of state keys every guard in this graph reads —
across ALL tool `when`s, container-node `when`s, and skill preconditions,
whether or not the node is currently mounted. Seed each of these in your
state projector: a guard key ABSENT from projected state is NOT treated as
false and hidden — it is served WITH the `guardUnevaluated` honesty marker
(the edge is offered, the missing condition flagged as taken-on-faith), so
an incompletely-seeded projector silently degrades honest availability into
unevaluated-guess territory. Container `when`s are included because they
AND-compose into every descendant tool's guard (at build, and into
mount-declared tools at runtime), so a guard-bearing container must be
seeded even before a tool lands under it. A projection covering this whole
set is what lets guards actually decide rather than defer.

#### Returns

`string`[]
