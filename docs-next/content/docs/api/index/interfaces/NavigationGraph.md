---
title: NavigationGraph<Paths>
---

# Interface: NavigationGraph\<Paths\>

Defined in: [src/tree/types.ts:412](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L412)

## Type Parameters

### Paths

`Paths` *extends* `string` = `string`

## Properties

### actionNodes

> **actionNodes**: `Record`\<`string`, `string`[]\>

Defined in: [src/tree/types.ts:423](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L423)

Qualified action id → the node path(s) it lives on (root actions list their pages).

***

### id

> **id**: `string`

Defined in: [src/tree/types.ts:413](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L413)

***

### nodes

> **nodes**: `Record`\<`string`, [`MapNode`](/api/index/interfaces/MapNode)\>

Defined in: [src/tree/types.ts:421](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L421)

Every node by path — pages included.

***

### spec

> **spec**: [`NavigationGraphSpec`](/api/index/interfaces/NavigationGraphSpec)

Defined in: [src/tree/types.ts:419](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L419)

The flat projection: a Session-compatible NavigationGraphSpec whose affordance
ids are qualified dot paths and whose guards are the composed root→leaf
chains. A plain Session runs on it unchanged; InteractionSession adds the tree.

## Methods

### createSession()

> **createSession**(`opts?`): [`InteractionSession`](/api/index/classes/InteractionSession)\<`Paths`\>

Defined in: [src/tree/types.ts:425](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L425)

Create a live interaction session; `Paths` carries the typed node paths through.

#### Parameters

##### opts?

[`InteractionSessionOptions`](/api/index/interfaces/InteractionSessionOptions)

#### Returns

[`InteractionSession`](/api/index/classes/InteractionSession)\<`Paths`\>

***

### requiredStateKeys()

> **requiredStateKeys**(): `string`[]

Defined in: [src/tree/types.ts:440](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L440)

The sorted, deduped set of state keys every guard in this graph reads —
across ALL action `when`s, container-node `when`s, and journey preconditions,
whether or not the node is currently mounted. Seed each of these in your
state projector: a guard key ABSENT from projected state is NOT treated as
false and hidden — it is served WITH the `guardUnevaluated` honesty marker
(the edge is offered, the missing condition flagged as taken-on-faith), so
an incompletely-seeded projector silently degrades honest availability into
unevaluated-guess territory. Container `when`s are included because they
AND-compose into every descendant action's guard (at build, and into
mount-declared actions at runtime), so a guard-bearing container must be
seeded even before an action lands under it. A projection covering this whole
set is what lets guards actually decide rather than defer.

#### Returns

`string`[]
