---
title: FireSettlement
---

# Interface: FireSettlement

Defined in: [src/atom/types.ts:534](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L534)

The final truth about one fire, delivered once through `FireResult.whenSettled`.

## Properties

### effectStatus

> **effectStatus**: `"performed"` \| `"refused"` \| `"unobservable"`

Defined in: [src/atom/types.ts:536](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L536)

'pending' is excluded by construction — a final answer is never "not yet".

***

### error?

> `optional` **error?**: `unknown`

Defined in: [src/atom/types.ts:547](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L547)

Why it was refused, when a handler failure caused the refusal: the thrown
error, or the returned failure's `error` (else the returned object
itself). Absent when the app itself declared the refusal via reject() —
there is no error object there and inventing one would be a guess.

***

### outcome

> **outcome**: [`Settlement`](/api/index/type-aliases/Settlement)

Defined in: [src/atom/types.ts:538](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L538)

The record's outcome at the moment it came to rest.

***

### produced?

> `optional` **produced?**: `unknown`

Defined in: [src/atom/types.ts:549](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L549)

The handler's return value, sanitized (parity with `Session.producedFor()`).

***

### transition

> **transition**: [`TransitionRecord`](/api/index/interfaces/TransitionRecord)

Defined in: [src/atom/types.ts:540](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L540)

A snapshot — never the live record, which may keep moving afterwards.
