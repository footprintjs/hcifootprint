---
title: FireSettlement
---

# Interface: FireSettlement

Defined in: [src/atom/types.ts:637](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L637)

The final truth about one fire, delivered once through `FireResult.whenSettled`.

## Properties

### effectStatus

> **effectStatus**: `"performed"` \| `"refused"` \| `"unobservable"`

Defined in: [src/atom/types.ts:639](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L639)

'pending' is excluded by construction — a final answer is never "not yet".

***

### error?

> `optional` **error?**: `unknown`

Defined in: [src/atom/types.ts:652](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L652)

Why it was refused, when a handler failure caused the refusal: the thrown
error, or the returned failure's `error` (else the returned object
itself) — or a [VerifyFailure](/api/index/interfaces/VerifyFailure) when the action's declared verify
contract is what refused it. Absent when the app itself declared the
refusal via reject() — there is no error object there and inventing one
would be a guess.

***

### outcome

> **outcome**: [`Settlement`](/api/index/type-aliases/Settlement)

Defined in: [src/atom/types.ts:641](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L641)

The record's outcome at the moment it came to rest.

***

### produced?

> `optional` **produced?**: `unknown`

Defined in: [src/atom/types.ts:667](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L667)

The handler's return value, sanitized (parity with `Session.producedFor()`).

***

### transition

> **transition**: [`TransitionRecord`](/api/index/interfaces/TransitionRecord)

Defined in: [src/atom/types.ts:643](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L643)

A snapshot — never the live record, which may keep moving afterwards.

***

### verified?

> `optional` **verified?**: `boolean` \| `"unevaluable"`

Defined in: [src/atom/types.ts:665](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L665)

What the action's declared [VerifyContract](/api/index/type-aliases/VerifyContract) said, once the fire came
to rest: `true` it held, `false` it did not (and this settlement is
'refused' because of it), `'unevaluable'` the check could not be run —
an unknown state key, or a predicate that threw. ABSENT when the action
declares no verify at all: silence, never a passing grade.

A THIRD axis, and deliberately not folded into either of the other two:
`effectStatus` asks whether anyone performed it, `transition.effectVerified`
asks whether the declared write KEYS appeared, and this asks whether the
app's own condition holds. All three can disagree honestly.
