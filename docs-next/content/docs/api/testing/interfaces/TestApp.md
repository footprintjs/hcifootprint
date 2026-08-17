---
title: TestApp<State>
---

# Interface: TestApp\<State\>

Defined in: [src/testing/harness.ts:114](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L114)

## Type Parameters

### State

`State` = `Record`\<`string`, `unknown`\>

## Properties

### agent

> `readonly` **agent**: `object`

Defined in: [src/testing/harness.ts:141](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L141)

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

Defined in: [src/testing/harness.ts:126](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L126)

The controllable clock (deterministic dormancy/mount-grace tests).

***

### node

> `readonly` **node**: `string`

Defined in: [src/testing/harness.ts:118](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L118)

The current page id.

***

### session

> `readonly` **session**: [`InteractionSession`](/api/index/classes/InteractionSession)

Defined in: [src/testing/harness.ts:116](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L116)

The real session under the hood — drop to it for anything the facade omits.

***

### user

> `readonly` **user**: `object`

Defined in: [src/testing/harness.ts:131](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L131)

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

Defined in: [src/testing/harness.ts:120](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L120)

The session cursor version.

## Methods

### advanceTime()

> **advanceTime**(`ms`): `void`

Defined in: [src/testing/harness.ts:128](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L128)

Advance the injected clock (sugar for clock.advance).

#### Parameters

##### ms

`number`

#### Returns

`void`

***

### back()

> **back**(`page`): `void`

Defined in: [src/testing/harness.ts:155](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L155)

The browser back button (or any external navigation) — recorded as a stimulus sync.

#### Parameters

##### page

`string`

#### Returns

`void`

***

### close()

> **close**(`path`): `void`

Defined in: [src/testing/harness.ts:160](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L160)

Unmount a node opened with open().

#### Parameters

##### path

`string`

#### Returns

`void`

***

### expectAvailable()

> **expectAvailable**(`affordanceId`): `void`

Defined in: [src/testing/harness.ts:174](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L174)

Assert an action (by id or bare/leaf suffix) is available right now.

#### Parameters

##### affordanceId

`string`

#### Returns

`void`

***

### expectClean()

> **expectClean**(`opts?`): `void`

Defined in: [src/testing/harness.ts:180](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L180)

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

Defined in: [src/testing/harness.ts:178](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L178)

Assert a journey has a completed frame in the history.

#### Parameters

##### journeyId

`string`

#### Returns

`void`

***

### expectOn()

> **expectOn**(`page`): `void`

Defined in: [src/testing/harness.ts:170](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L170)

Assert the cursor is on `page`.

#### Parameters

##### page

`string`

#### Returns

`void`

***

### expectRejected()

> **expectRejected**(`result`, `reason?`): `void`

Defined in: [src/testing/harness.ts:176](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L176)

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

Defined in: [src/testing/harness.ts:172](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L172)

Assert the projected state contains these key/value pairs (deep).

#### Parameters

##### partial

`Partial`\<`State`\> & `Record`\<`string`, `unknown`\>

#### Returns

`void`

***

### open()

> **open**(`path`, `opts?`): [`ActionGroupHandle`](/api/index/interfaces/ActionGroupHandle)

Defined in: [src/testing/harness.ts:158](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L158)

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

Defined in: [src/testing/harness.ts:166](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L166)

The honesty-marker drift report — the release-readiness signal.

#### Returns

[`DriftReport`](/api/testing/interfaces/DriftReport)

***

### settled()

> **settled**(): `Promise`\<`void`\>

Defined in: [src/testing/harness.ts:163](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L163)

Drain to quiescence (auto-called by user.fire/agent.*; call it after fireRaw/stimulus).

#### Returns

`Promise`\<`void`\>

***

### state()

> **state**(): `State`

Defined in: [src/testing/harness.ts:122](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L122)

A detached snapshot of the projected state.

#### Returns

`State`

***

### stimulus()

> **stimulus**(`patch`, `opts?`): `void`

Defined in: [src/testing/harness.ts:153](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L153)

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

Defined in: [src/testing/harness.ts:124](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/harness.ts#L124)

Dev warnings the session emitted (StrictMode notes, handler errors, drift warnings).

#### Returns

`string`[]
