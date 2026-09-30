---
title: ActionWalk
---

# Interface: ActionWalk

Defined in: [src/action/walk.ts:118](https://github.com/footprintjs/hcifootprint/blob/main/src/action/walk.ts#L118)

## Properties

### ref

> `readonly` **ref**: [`ActionWalkRef`](/api/index/interfaces/ActionWalkRef)

Defined in: [src/action/walk.ts:119](https://github.com/footprintjs/hcifootprint/blob/main/src/action/walk.ts#L119)

## Methods

### interrupt()

> **interrupt**(`input`): `boolean`

Defined in: [src/action/walk.ts:144](https://github.com/footprintjs/hcifootprint/blob/main/src/action/walk.ts#L144)

Stop this walk's plan at the next step boundary, with the reason on the
record. Arms the walk: consumed by the plan in flight before its next
step, or by the next run() at step zero — the person's intent stands
either way. Returns false when already armed. The reason is REQUIRED:
a silent break is the abandonment this family refuses.

#### Parameters

##### input

###### by

[`Principal`](/api/index/type-aliases/Principal)

###### reason

`string`

#### Returns

`boolean`

***

### record()

> **record**(): `object`

Defined in: [src/action/walk.ts:147](https://github.com/footprintjs/hcifootprint/blob/main/src/action/walk.ts#L147)

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

> **run**(`steps`, `options?`): `Promise`\<[`ActionPlanManifest`](/api/index/interfaces/ActionPlanManifest)\>

Defined in: [src/action/walk.ts:126](https://github.com/footprintjs/hcifootprint/blob/main/src/action/walk.ts#L126)

Admit and execute one plan. Admission failures THROW before anything
runs — nothing happened, so an exception is honest. Execution failures
never throw: they are manifest rows, because by then something DID
happen and the caller needs the ledger, not a stack trace.

#### Parameters

##### steps

readonly [`ActionPlanStep`](/api/index/interfaces/ActionPlanStep)[]

##### options?

###### onRow?

(`row`) => `void`

Called as each row lands — the FE's live loop: render the batch
 step by step, and put the stop control beside it, because the
 moment you can SEE a batch running is the moment you need to be
 able to stop it. Isolated: a listener that throws never breaks
 the walk (the recorder law, applied here).

#### Returns

`Promise`\<[`ActionPlanManifest`](/api/index/interfaces/ActionPlanManifest)\>
