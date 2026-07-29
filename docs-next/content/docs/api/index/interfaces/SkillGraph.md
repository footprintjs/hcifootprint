---
title: SkillGraph
---

# Interface: SkillGraph

Defined in: [src/graph/builder.ts:27](https://github.com/footprintjs/hcifootprint/blob/main/src/graph/builder.ts#L27)

## Properties

### spec

> **spec**: [`SkillGraphSpec`](/api/index/interfaces/SkillGraphSpec)

Defined in: [src/graph/builder.ts:28](https://github.com/footprintjs/hcifootprint/blob/main/src/graph/builder.ts#L28)

## Methods

### createSession()

> **createSession**(`opts`): [`Session`](/api/index/classes/Session)

Defined in: [src/graph/builder.ts:29](https://github.com/footprintjs/hcifootprint/blob/main/src/graph/builder.ts#L29)

#### Parameters

##### opts

[`SessionOptions`](/api/index/interfaces/SessionOptions)

#### Returns

[`Session`](/api/index/classes/Session)

***

### requiredStateKeys()

> **requiredStateKeys**(): `string`[]

Defined in: [src/graph/builder.ts:41](https://github.com/footprintjs/hcifootprint/blob/main/src/graph/builder.ts#L41)

The sorted, deduped set of state keys every guard in this graph reads —
across all affordance guards and skill preconditions, whether or not their
tool is currently offered. Seed each of these in your state projector: a
guard key ABSENT from projected state is NOT treated as false and hidden —
it is served WITH the `guardUnevaluated` honesty marker (the edge is
offered, the missing condition flagged as taken-on-faith), so an
incompletely-seeded projector silently degrades honest availability into
unevaluated-guess territory. A projection covering this whole set is what
lets guards actually decide rather than defer.

#### Returns

`string`[]
