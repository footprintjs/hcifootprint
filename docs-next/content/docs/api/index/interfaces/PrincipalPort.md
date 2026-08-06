---
title: PrincipalPort
---

# Interface: PrincipalPort

Defined in: [src/atom/types.ts:2229](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2229)

A SESSION DOOR WITH THE PRINCIPAL ALREADY ON IT — `session.asAgent()`,
`asHuman()`, `asSystem()`.

Provenance was a per-call argument, repeated at every door, and a repeated
argument is a forgotten argument: a relay that omits `source` files a machine's
action under the library's default, and one that copies the wrong line files it
under a person. The port says it ONCE, at the boundary where the caller's
identity is actually known.

IT IS THE SAME ASSERTION, NOT A STRONGER ONE. A port stamps
`attribution.basis: 'caller-asserted'` exactly as `fire({ source })` does,
because it is the same caller making the same claim with less repetition —
recording ergonomics as evidence would be this library laundering convenience
into proof. `fire({ source })` stays fully supported; nothing here replaces it.

NO AUTHORITY DOOR IS ON IT, EVER. `approveAsk`, `alwaysApprove`, `revokeAsk`
and `declineConfirm` are the human-side doors the approval gate's whole design
rests on — a port carrying them is a capability whose safety depends on nobody
handing the wrong port to the wrong caller, which is the trap this library
refuses on principle. The port binds ACT doors only.

## Properties

### as

> `readonly` **as**: [`ActorKind`](/api/index/type-aliases/ActorKind)

Defined in: [src/atom/types.ts:2231](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2231)

The actor kind this port speaks as. Read-only — a port never changes principals.

***

### principal

> `readonly` **principal**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:2233](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2233)

The principal its acts are FILED under ('human' files as 'user').

***

### updateState?

> `optional` **updateState?**: `undefined`

Defined in: [src/atom/types.ts:2252](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2252)

NO `updateState` HERE, and the absence is the design.

`UpdateOptions.principal` does not mean "I am reporting this" — it means
"THIS MOTION WAS WORLD-INITIATED, attribute it to X", and it is one half of
the explicit-stimulus signal that deliberately stops a report from settling
a pending fire. A port that helpfully filled it in would turn the most
natural call an app makes (`port.updateState({ cart: 1 })`) into a stimulus
row that closes nothing, and the fire it was meant to answer would wait
forever. Report state through `session.updateState(...)`, where the two
meanings stay apart.

## Methods

### fire()

> **fire**(`affordanceId`, `opts?`): [`FireResult`](/api/index/type-aliases/FireResult)

Defined in: [src/atom/types.ts:2235](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2235)

Fire, as this principal. Every other [FireOptions](/api/index/interfaces/FireOptions) field still applies.

#### Parameters

##### affordanceId

`string`

##### opts?

`Omit`\<[`FireOptions`](/api/index/interfaces/FireOptions), `"source"`\>

#### Returns

[`FireResult`](/api/index/type-aliases/FireResult)

***

### reportGap()

> **reportGap**(`opts`): [`GapRecord`](/api/index/interfaces/GapRecord)

Defined in: [src/atom/types.ts:2239](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2239)

Record unmet demand, as this principal.

#### Parameters

##### opts

`Omit`\<[`ReportGapOptions`](/api/index/interfaces/ReportGapOptions), `"principal"`\>

#### Returns

[`GapRecord`](/api/index/interfaces/GapRecord)

***

### sync()

> **sync**(`observedNode`, `opts?`): [`SyncResult`](/api/index/type-aliases/SyncResult)

Defined in: [src/atom/types.ts:2237](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2237)

Report where the app now is, as this principal.

#### Parameters

##### observedNode

`string`

##### opts?

###### stimulus?

[`StimulusKind`](/api/index/type-aliases/StimulusKind)

#### Returns

[`SyncResult`](/api/index/type-aliases/SyncResult)
