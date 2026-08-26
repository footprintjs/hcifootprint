---
title: ActionPlanManifest
---

# Interface: ActionPlanManifest

Defined in: src/action/walk.ts:83

## Properties

### completed

> `readonly` **completed**: `boolean`

Defined in: src/action/walk.ts:88

Every row ran AND performed. A manifest that said "failed" while the
 screen sits two steps along would be worse than no batching.

***

### counts

> `readonly` **counts**: `object`

Defined in: src/action/walk.ts:89

#### neverReached

> `readonly` **neverReached**: `number`

#### planned

> `readonly` **planned**: `number`

#### ran

> `readonly` **ran**: `number`

#### refused

> `readonly` **refused**: `number`

***

### rows

> `readonly` **rows**: readonly [`ActionPlanRow`](/api/index/interfaces/ActionPlanRow)[]

Defined in: src/action/walk.ts:85

***

### walk

> `readonly` **walk**: [`ActionWalkRef`](/api/index/interfaces/ActionWalkRef)

Defined in: src/action/walk.ts:84
