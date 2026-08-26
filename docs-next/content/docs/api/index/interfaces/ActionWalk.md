---
title: ActionWalk
---

# Interface: ActionWalk

Defined in: [src/action/walk.ts:97](https://github.com/footprintjs/hcifootprint/blob/main/src/action/walk.ts#L97)

## Properties

### ref

> `readonly` **ref**: [`ActionWalkRef`](/api/index/interfaces/ActionWalkRef)

Defined in: [src/action/walk.ts:98](https://github.com/footprintjs/hcifootprint/blob/main/src/action/walk.ts#L98)

## Methods

### record()

> **record**(): `object`

Defined in: [src/action/walk.ts:108](https://github.com/footprintjs/hcifootprint/blob/main/src/action/walk.ts#L108)

Every manifest this walk has produced, in order — the route actually
 taken, which is not the route anybody planned.

#### Returns

`object`

##### manifests

> `readonly` **manifests**: readonly [`ActionPlanManifest`](/api/index/interfaces/ActionPlanManifest)[]

##### ref

> `readonly` **ref**: [`ActionWalkRef`](/api/index/interfaces/ActionWalkRef)

***

### run()

> **run**(`steps`): `Promise`\<[`ActionPlanManifest`](/api/index/interfaces/ActionPlanManifest)\>

Defined in: [src/action/walk.ts:105](https://github.com/footprintjs/hcifootprint/blob/main/src/action/walk.ts#L105)

Admit and execute one plan. Admission failures THROW before anything
runs — nothing happened, so an exception is honest. Execution failures
never throw: they are manifest rows, because by then something DID
happen and the caller needs the ledger, not a stack trace.

#### Parameters

##### steps

readonly [`ActionPlanStep`](/api/index/interfaces/ActionPlanStep)[]

#### Returns

`Promise`\<[`ActionPlanManifest`](/api/index/interfaces/ActionPlanManifest)\>
