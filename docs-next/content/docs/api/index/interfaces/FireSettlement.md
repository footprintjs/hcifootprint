---
title: FireSettlement
---

# Interface: FireSettlement

Defined in: [src/atom/types.ts:541](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L541)

The final truth about one fire, delivered once through `FireResult.whenSettled`.

## Properties

### effectStatus

> **effectStatus**: `"performed"` \| `"refused"` \| `"unobservable"`

Defined in: [src/atom/types.ts:543](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L543)

'pending' is excluded by construction — a final answer is never "not yet".

***

### error?

> `optional` **error?**: `unknown`

Defined in: [src/atom/types.ts:554](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L554)

Why it was refused, when a handler failure caused the refusal: the thrown
error, or the returned failure's `error` (else the returned object
itself). Absent when the app itself declared the refusal via reject() —
there is no error object there and inventing one would be a guess.

***

### outcome

> **outcome**: [`Settlement`](/api/index/type-aliases/Settlement)

Defined in: [src/atom/types.ts:545](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L545)

The record's outcome at the moment it came to rest.

***

### produced?

> `optional` **produced?**: `unknown`

Defined in: [src/atom/types.ts:556](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L556)

The handler's return value, sanitized (parity with `Session.producedFor()`).

***

### transition

> **transition**: [`TransitionRecord`](/api/index/interfaces/TransitionRecord)

Defined in: [src/atom/types.ts:547](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L547)

A snapshot — never the live record, which may keep moving afterwards.
