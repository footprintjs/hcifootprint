---
title: ActionWalkWithParallel
---

# Interface: ActionWalkWithParallel

Defined in: [src/action/walk.ts:169](https://github.com/footprintjs/hcifootprint/blob/main/src/action/walk.ts#L169)

The factory's extended surface. Existing structural ActionWalk values
remain valid without implementing the new operation.

## Extends

- [`ActionWalk`](/api/index/interfaces/ActionWalk)

## Properties

### ref

> `readonly` **ref**: [`ActionWalkRef`](/api/index/interfaces/ActionWalkRef)

Defined in: [src/action/walk.ts:133](https://github.com/footprintjs/hcifootprint/blob/main/src/action/walk.ts#L133)

#### Inherited from

[`ActionWalk`](/api/index/interfaces/ActionWalk).[`ref`](/api/index/interfaces/ActionWalk#ref)

## Methods

### interrupt()

> **interrupt**(`input`): `boolean`

Defined in: [src/action/walk.ts:158](https://github.com/footprintjs/hcifootprint/blob/main/src/action/walk.ts#L158)

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

#### Inherited from

[`ActionWalk`](/api/index/interfaces/ActionWalk).[`interrupt`](/api/index/interfaces/ActionWalk#interrupt)

***

### parallel()

> **parallel**(`steps`, `options?`): `Promise`\<[`ActionPlanManifest`](/api/index/interfaces/ActionPlanManifest)\>

Defined in: [src/action/walk.ts:175](https://github.com/footprintjs/hcifootprint/blob/main/src/action/walk.ts#L175)

Run caller-selected independent actions with bounded asynchronous overlap.
Admission failures throw before dispatch. Individual refusals/failures do
not stop independent queued items; interruption stops only undispatched
items and waits for running handlers. Completion concerns whenInvoked,
never automatic effect verification.

#### Parameters

##### steps

readonly [`ActionParallelStep`](/api/index/type-aliases/ActionParallelStep)[]

##### options?

###### concurrency?

`number`

Defaults to the number of items. Must be a positive safe integer.

###### onRow?

(`row`) => `void`

Completion order; the final manifest retains input order.

#### Returns

`Promise`\<[`ActionPlanManifest`](/api/index/interfaces/ActionPlanManifest)\>

***

### record()

> **record**(): `object`

Defined in: [src/action/walk.ts:161](https://github.com/footprintjs/hcifootprint/blob/main/src/action/walk.ts#L161)

Every manifest this walk has produced, in order — the route actually
 taken, which is not the route anybody planned.

#### Returns

`object`

##### manifests

> `readonly` **manifests**: readonly [`ActionPlanManifest`](/api/index/interfaces/ActionPlanManifest)[]

##### ref

> `readonly` **ref**: [`ActionWalkRef`](/api/index/interfaces/ActionWalkRef)

#### Inherited from

[`ActionWalk`](/api/index/interfaces/ActionWalk).[`record`](/api/index/interfaces/ActionWalk#record)

***

### run()

> **run**(`steps`, `options?`): `Promise`\<[`ActionPlanManifest`](/api/index/interfaces/ActionPlanManifest)\>

Defined in: [src/action/walk.ts:140](https://github.com/footprintjs/hcifootprint/blob/main/src/action/walk.ts#L140)

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

#### Inherited from

[`ActionWalk`](/api/index/interfaces/ActionWalk).[`run`](/api/index/interfaces/ActionWalk#run)
