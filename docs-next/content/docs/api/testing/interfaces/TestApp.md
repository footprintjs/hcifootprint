---
title: TestApp<State>
---

# Interface: TestApp\<State\>

Defined in: [src/testing/harness.ts:113](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L113)

## Type Parameters

### State

`State` = `Record`\<`string`, `unknown`\>

## Properties

### agent

> `readonly` **agent**: `object`

Defined in: [src/testing/harness.ts:140](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L140)

Drive like the planning LLM, through the real Mode B port. Returns ServeResult (needs-confirm is data, never a throw).

#### do()

> **do**(`action`, `args?`): `Promise`\<[`ServeResult`](/api/index/type-aliases/ServeResult)\>

Perform one action outside a journey flow (do_action).

##### Parameters

###### action

`string`

###### args?

`Omit`\<[`DoActionArgs`](/api/index/interfaces/DoActionArgs), `"action"`\>

##### Returns

`Promise`\<[`ServeResult`](/api/index/type-aliases/ServeResult)\>

#### journey()

> **journey**(`journeyId`, `args?`): `Promise`\<[`ServeResult`](/api/index/type-aliases/ServeResult)\>

Open/step a journey by its id (maps to the journey's fixed tool).

##### Parameters

###### journeyId

`string`

###### args?

[`JourneyCallArgs`](/api/index/interfaces/JourneyCallArgs)

##### Returns

`Promise`\<[`ServeResult`](/api/index/type-aliases/ServeResult)\>

#### tools()

> **tools**(): [`MCPToolDescription`](/api/index/interfaces/MCPToolDescription)[]

The FIXED tool array the model sees (one per journey + whats_here/do_action).

##### Returns

[`MCPToolDescription`](/api/index/interfaces/MCPToolDescription)[]

#### whatsHere()

> **whatsHere**(): `Promise`\<[`ServeResult`](/api/index/type-aliases/ServeResult)\>

Call whats_here.

##### Returns

`Promise`\<[`ServeResult`](/api/index/type-aliases/ServeResult)\>

***

### clock

> `readonly` **clock**: [`TestClock`](/api/testing/interfaces/TestClock)

Defined in: [src/testing/harness.ts:125](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L125)

The controllable clock (deterministic dormancy/mount-grace tests).

***

### node

> `readonly` **node**: `string`

Defined in: [src/testing/harness.ts:117](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L117)

The current page id.

***

### session

> `readonly` **session**: [`InteractionSession`](/api/index/classes/InteractionSession)

Defined in: [src/testing/harness.ts:115](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L115)

The real session under the hood — drop to it for anything the facade omits.

***

### user

> `readonly` **user**: `object`

Defined in: [src/testing/harness.ts:130](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L130)

Drive like a human click. Throws on rejection (fail-fast).

#### fire()

> **fire**(`affordanceId`, `opts?`): `Promise`\<[`TransitionRecord`](/api/index/interfaces/TransitionRecord)\>

Fire, auto-settle, return the settled record. Throws if the fire is refused.

##### Parameters

###### affordanceId

`string`

###### opts?

###### instance?

`string`

###### payload?

`unknown`

##### Returns

`Promise`\<[`TransitionRecord`](/api/index/interfaces/TransitionRecord)\>

#### fireRaw()

> **fireRaw**(`affordanceId`, `opts?`): [`FireResult`](/api/index/type-aliases/FireResult)

Fire WITHOUT auto-settling — observe the pending/optimistic-UI window yourself.

##### Parameters

###### affordanceId

`string`

###### opts?

###### instance?

`string`

###### payload?

`unknown`

##### Returns

[`FireResult`](/api/index/type-aliases/FireResult)

#### tryFire()

> **tryFire**(`affordanceId`, `opts?`): `Promise`\<[`FireResult`](/api/index/type-aliases/FireResult)\>

Fire + auto-settle but NEVER throw — return the raw FireResult (inspect a rejection).

##### Parameters

###### affordanceId

`string`

###### opts?

###### instance?

`string`

###### payload?

`unknown`

##### Returns

`Promise`\<[`FireResult`](/api/index/type-aliases/FireResult)\>

***

### version

> `readonly` **version**: `number`

Defined in: [src/testing/harness.ts:119](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L119)

The session cursor version.

## Methods

### advanceTime()

> **advanceTime**(`ms`): `void`

Defined in: [src/testing/harness.ts:127](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L127)

Advance the injected clock (sugar for clock.advance).

#### Parameters

##### ms

`number`

#### Returns

`void`

***

### back()

> **back**(`page`): `void`

Defined in: [src/testing/harness.ts:154](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L154)

The browser back button (or any external navigation) — recorded as a stimulus sync.

#### Parameters

##### page

`string`

#### Returns

`void`

***

### close()

> **close**(`path`): `void`

Defined in: [src/testing/harness.ts:159](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L159)

Unmount a node opened with open().

#### Parameters

##### path

`string`

#### Returns

`void`

***

### expectAvailable()

> **expectAvailable**(`affordanceId`): `void`

Defined in: [src/testing/harness.ts:173](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L173)

Assert an action (by id or bare/leaf suffix) is available right now.

#### Parameters

##### affordanceId

`string`

#### Returns

`void`

***

### expectClean()

> **expectClean**(`opts?`): `void`

Defined in: [src/testing/harness.ts:179](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L179)

Assert no declared-effect drift (optionally also fail on any gaps). The opt-in release gate.

#### Parameters

##### opts?

###### includeGaps?

`boolean`

#### Returns

`void`

***

### expectJourneyCompleted()

> **expectJourneyCompleted**(`journeyId`): `void`

Defined in: [src/testing/harness.ts:177](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L177)

Assert a journey has a completed frame in the history.

#### Parameters

##### journeyId

`string`

#### Returns

`void`

***

### expectOn()

> **expectOn**(`page`): `void`

Defined in: [src/testing/harness.ts:169](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L169)

Assert the cursor is on `page`.

#### Parameters

##### page

`string`

#### Returns

`void`

***

### expectRejected()

> **expectRejected**(`result`, `reason?`): `void`

Defined in: [src/testing/harness.ts:175](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L175)

Assert a FireResult was refused (optionally with a specific reason, e.g. 'GUARD_FAILED').

#### Parameters

##### result

[`FireResult`](/api/index/type-aliases/FireResult)

##### reason?

`string`

#### Returns

`void`

***

### expectState()

> **expectState**(`partial`): `void`

Defined in: [src/testing/harness.ts:171](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L171)

Assert the projected state contains these key/value pairs (deep).

#### Parameters

##### partial

`Partial`\<`State`\> & `Record`\<`string`, `unknown`\>

#### Returns

`void`

***

### open()

> **open**(`path`, `opts?`): [`ActionGroupHandle`](/api/index/interfaces/ActionGroupHandle)

Defined in: [src/testing/harness.ts:157](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L157)

Mount + show a modal/tab node's tools (not auto-mounted). Returns its handle.

#### Parameters

##### path

`string`

##### opts?

###### instance?

`string`

#### Returns

[`ActionGroupHandle`](/api/index/interfaces/ActionGroupHandle)

***

### report()

> **report**(): [`DriftReport`](/api/testing/interfaces/DriftReport)

Defined in: [src/testing/harness.ts:165](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L165)

The honesty-marker drift report — the release-readiness signal.

#### Returns

[`DriftReport`](/api/testing/interfaces/DriftReport)

***

### settled()

> **settled**(): `Promise`\<`void`\>

Defined in: [src/testing/harness.ts:162](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L162)

Drain to quiescence (auto-called by user.fire/agent.*; call it after fireRaw/stimulus).

#### Returns

`Promise`\<`void`\>

***

### state()

> **state**(): `State`

Defined in: [src/testing/harness.ts:121](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L121)

A detached snapshot of the projected state.

#### Returns

`State`

***

### stimulus()

> **stimulus**(`patch`, `opts?`): `void`

Defined in: [src/testing/harness.ts:152](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L152)

A world-initiated state change (server push, background update) — never blamed on a pending fire.

#### Parameters

##### patch

`Partial`\<`State`\> & `Record`\<`string`, `unknown`\>

##### opts?

###### stimulus?

[`StimulusKind`](/api/index/type-aliases/StimulusKind)

#### Returns

`void`

***

### warnings()

> **warnings**(): `string`[]

Defined in: [src/testing/harness.ts:123](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L123)

Dev warnings the session emitted (StrictMode notes, handler errors, drift warnings).

#### Returns

`string`[]
