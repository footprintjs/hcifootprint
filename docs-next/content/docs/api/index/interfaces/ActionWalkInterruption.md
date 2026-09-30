---
title: ActionWalkInterruption
---

# Interface: ActionWalkInterruption

Defined in: [src/action/walk.ts:90](https://github.com/footprintjs/hcifootprint/blob/main/src/action/walk.ts#L90)

A person (or system) stopping a plan, WITH the reason — because a break
without a reason is a guard failure wearing a trench coat: the model
replans blind and probably replans the same thing. The reason is what
turns an interruption into a course correction.

## Properties

### beforeStep

> `readonly` **beforeStep**: `number`

Defined in: [src/action/walk.ts:97](https://github.com/footprintjs/hcifootprint/blob/main/src/action/walk.ts#L97)

The step the break took effect BEFORE. The in-flight step always
 finishes — an L1 transition is atomic, and tearing one mid-flight
 would violate settlement law. L2 stops future steps; L1 transitions
 are never torn.

***

### by

> `readonly` **by**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/action/walk.ts:91](https://github.com/footprintjs/hcifootprint/blob/main/src/action/walk.ts#L91)

***

### reason

> `readonly` **reason**: `string`

Defined in: [src/action/walk.ts:92](https://github.com/footprintjs/hcifootprint/blob/main/src/action/walk.ts#L92)
