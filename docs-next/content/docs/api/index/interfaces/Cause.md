---
title: Cause
---

# Interface: Cause

Defined in: [src/atom/types.ts:44](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L44)

Why a transition exists.
- `fired`   — an affordance was fired through the driver (guard-checked).
- `stimulus`— the world moved without an offered edge (back button, server
              push, session expiry). Recorded, never silent.

## Properties

### affordanceId?

> `optional` **affordanceId?**: `string`

Defined in: [src/atom/types.ts:48](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L48)

Set when kind === 'fired'.

***

### inferred?

> `optional` **inferred?**: `boolean`

Defined in: [src/atom/types.ts:56](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L56)

True when the attribution was GUESSED by effect-signature inference (an
unattributed delta matched exactly one registered affordance's declared
writes) rather than observed. Honesty marker — never laundered as fact.

***

### kind

> **kind**: `"fired"` \| `"stimulus"`

Defined in: [src/atom/types.ts:45](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L45)

***

### principal

> **principal**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:46](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L46)

***

### stimulus?

> `optional` **stimulus?**: [`StimulusKind`](/api/index/type-aliases/StimulusKind)

Defined in: [src/atom/types.ts:50](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L50)

Set when kind === 'stimulus'.
