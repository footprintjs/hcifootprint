---
title: FireSettlement
---

# Interface: FireSettlement

Defined in: [src/atom/types.ts:1167](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1167)

The final truth about one fire, delivered once through `FireResult.whenSettled`.

## Properties

### effectStatus

> **effectStatus**: `"performed"` \| `"refused"` \| `"unobservable"`

Defined in: [src/atom/types.ts:1169](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1169)

'pending' is excluded by construction — a final answer is never "not yet".

***

### error?

> `optional` **error?**: `unknown`

Defined in: [src/atom/types.ts:1182](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1182)

Why it was refused, when a handler failure caused the refusal: the thrown
error, or the returned failure's `error` (else the returned object
itself) — or a [VerifyFailure](/api/index/interfaces/VerifyFailure) when the action's declared verify
contract is what refused it. Absent when the app itself declared the
refusal via reject() — there is no error object there and inventing one
would be a guess.

***

### outcome

> **outcome**: [`Settlement`](/api/index/type-aliases/Settlement)

Defined in: [src/atom/types.ts:1171](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1171)

The record's outcome at the moment it came to rest.

***

### produced?

> `optional` **produced?**: `unknown`

Defined in: [src/atom/types.ts:1206](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1206)

The handler's return value, sanitized (parity with `Session.producedFor()`).

***

### transition

> **transition**: [`TransitionRecord`](/api/index/interfaces/TransitionRecord)

Defined in: [src/atom/types.ts:1173](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1173)

A snapshot — never the live record, which may keep moving afterwards.

***

### verifyHeld?

> `optional` **verifyHeld?**: `boolean` \| `"unevaluable"`

Defined in: [src/atom/types.ts:1204](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1204)

What the action's declared [VerifyContract](/api/index/type-aliases/VerifyContract) said, once the fire came
to rest: `true` it held, `false` it did not (and this settlement is
'refused' because of it), `'unevaluable'` the check could not be run —
an unknown state key, or a predicate that threw. ABSENT when the action
declares no verify at all: silence, never a passing grade.

A THIRD axis, and deliberately not folded into either of the other two:
`effectStatus` asks whether anyone performed it, `transition.effectVerified`
asks whether the declared write KEYS appeared, and this asks whether the
app's own condition holds. All three can disagree honestly.

NAMED FOR THE DECLARATION THAT PRODUCED IT, not for the bare word
"verified" — which is the ambiguity that let two of these three axes share
one name on the wire and print opposite values in a single payload
(`verified: true` beside "the app was asked whether this happened, and
answered no"). A status a reader can attribute to the wrong question is a
status this library treats as unreported, so no axis here is called
`verified` alone: this one says which contract held, and the state axis
crosses the wire as `writesObserved`.
