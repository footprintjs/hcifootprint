---
title: ActionPlanManifest
---

# Interface: ActionPlanManifest

Defined in: [src/action/walk.ts:108](https://github.com/footprintjs/hcifootprint/blob/main/src/action/walk.ts#L108)

## Properties

### completed

> `readonly` **completed**: `boolean`

Defined in: [src/action/walk.ts:123](https://github.com/footprintjs/hcifootprint/blob/main/src/action/walk.ts#L123)

Every row ran AND performed. A manifest that said "failed" while the
 screen sits two steps along would be worse than no batching.

***

### counts

> `readonly` **counts**: `object`

Defined in: [src/action/walk.ts:124](https://github.com/footprintjs/hcifootprint/blob/main/src/action/walk.ts#L124)

#### neverReached

> `readonly` **neverReached**: `number`

#### planned

> `readonly` **planned**: `number`

#### ran

> `readonly` **ran**: `number`

#### refused

> `readonly` **refused**: `number`

***

### execution?

> `readonly` `optional` **execution?**: `object`

Defined in: [src/action/walk.ts:113](https://github.com/footprintjs/hcifootprint/blob/main/src/action/walk.ts#L113)

Absent on existing sequential manifests. The effective invocation limit,
not a claim of isolated UI contexts or verified effects.

#### concurrency

> `readonly` **concurrency**: `number`

#### mode

> `readonly` **mode**: `"parallel"`

***

### interrupted?

> `readonly` `optional` **interrupted?**: [`ActionWalkInterruption`](/api/index/interfaces/ActionWalkInterruption)

Defined in: [src/action/walk.ts:120](https://github.com/footprintjs/hcifootprint/blob/main/src/action/walk.ts#L120)

Present when a person stopped this plan — distinct from a refused row,
 because "the plan was wrong" and "the person knows something the plan
 didn't" must be treated completely differently by whoever replans.

***

### rows

> `readonly` **rows**: readonly [`ActionPlanRow`](/api/index/interfaces/ActionPlanRow)[]

Defined in: [src/action/walk.ts:110](https://github.com/footprintjs/hcifootprint/blob/main/src/action/walk.ts#L110)

***

### walk

> `readonly` **walk**: [`ActionWalkRef`](/api/index/interfaces/ActionWalkRef)

Defined in: [src/action/walk.ts:109](https://github.com/footprintjs/hcifootprint/blob/main/src/action/walk.ts#L109)
