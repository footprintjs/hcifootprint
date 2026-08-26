---
title: InputRequestSnapshot
---

# Interface: InputRequestSnapshot

Defined in: src/action/request.ts:70

## Properties

### answer?

> `readonly` `optional` **answer?**: `string`

Defined in: src/action/request.ts:84

***

### authority?

> `readonly` `optional` **authority?**: [`ActionAbandonmentAuthority`](/api/index/type-aliases/ActionAbandonmentAuthority)

Defined in: src/action/request.ts:87

***

### declineReason?

> `readonly` `optional` **declineReason?**: `unknown`

Defined in: src/action/request.ts:85

***

### from

> `readonly` **from**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: src/action/request.ts:76

Who may answer.

***

### lateAnswers?

> `readonly` `optional` **lateAnswers?**: readonly [`ActionLateSettlement`](/api/index/interfaces/ActionLateSettlement)[]

Defined in: src/action/request.ts:90

Answers that arrived after the terminal — kept and quoted, never
 adopted, never reopening. Absent when none did.

***

### of

> `readonly` **of**: `string`

Defined in: src/action/request.ts:74

The KIND being asked for — governed like every other kind.

***

### offered

> `readonly` **offered**: readonly [`RequestChoice`](/api/index/interfaces/RequestChoice)[]

Defined in: src/action/request.ts:78

***

### question

> `readonly` **question**: `string`

Defined in: src/action/request.ts:72

***

### ref

> `readonly` **ref**: [`InputRequestRef`](/api/index/interfaces/InputRequestRef)

Defined in: src/action/request.ts:71

***

### state

> `readonly` **state**: [`InputRequestState`](/api/index/type-aliases/InputRequestState)

Defined in: src/action/request.ts:77

***

### surfaces

> `readonly` **surfaces**: readonly [`SurfaceDeclaration`](/api/index/interfaces/SurfaceDeclaration)[]

Defined in: src/action/request.ts:83

The surfaces that could collect this kind WHEN THE REQUEST OPENED —
 presentation routing, recorded for the record. A missing surface never
 blocks the request: prose is the honest fallback, and the miss is
 already counted on the board.

***

### withdrawReason?

> `readonly` `optional` **withdrawReason?**: `unknown`

Defined in: src/action/request.ts:86
