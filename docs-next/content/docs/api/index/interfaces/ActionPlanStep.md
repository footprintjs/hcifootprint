---
title: ActionPlanStep
---

# Interface: ActionPlanStep

Defined in: src/action/walk.ts:51

One planned step. `carry` and `input` are exclusive: a step's payload is
either stated at plan time or carried from a prior step's declared output —
never both, and never guessed.

## Properties

### action

> `readonly` **action**: [`DefinedAction`](/api/index/type-aliases/DefinedAction)

Defined in: src/action/walk.ts:52

***

### carry?

> `readonly` `optional` **carry?**: `object`

Defined in: src/action/walk.ts:67

Carry a PRIOR step's produced value as this step's payload — admitted
only when the producer's definition DECLARES `produces`. The gate is the
declaration, not the value: a carried value must come from a declared
output, never from whatever a handler happened to return. This is the
narrow middle between "no chaining" (which guts planning — the plans
worth batching are exactly the chained ones) and free references (a
dataflow language by the back door).

#### from

> `readonly` **from**: `number`

***

### input?

> `readonly` `optional` **input?**: `unknown`

Defined in: src/action/walk.ts:57

The payload for an open offer, known at plan time.

***

### instance?

> `readonly` `optional` **instance?**: `string`

Defined in: src/action/walk.ts:55

Disambiguates when one definition has several live bindings. Ambiguity
 without this is a refusal, never a guess.
