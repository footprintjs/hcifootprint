---
title: InputRequestHandle
---

# Interface: InputRequestHandle

Defined in: src/action/request.ts:93

## Properties

### ref

> `readonly` **ref**: [`InputRequestRef`](/api/index/interfaces/InputRequestRef)

Defined in: src/action/request.ts:94

***

### whenSettled

> `readonly` **whenSettled**: `Promise`\<[`InputRequestSnapshot`](/api/index/interfaces/InputRequestSnapshot)\>

Defined in: src/action/request.ts:97

Resolves with the terminal snapshot, whichever terminal it is.

## Methods

### abandon()

> **abandon**(`authority`): [`InputRequestSnapshot`](/api/index/interfaces/InputRequestSnapshot)

Defined in: src/action/request.ts:107

Never inferred from silence — an explicit authority, exactly as a
 transition's abandonment is.

#### Parameters

##### authority

[`ActionAbandonmentAuthority`](/api/index/type-aliases/ActionAbandonmentAuthority)

#### Returns

[`InputRequestSnapshot`](/api/index/interfaces/InputRequestSnapshot)

***

### answer()

> **answer**(`value`, `by`): [`InputRequestSnapshot`](/api/index/interfaces/InputRequestSnapshot)

Defined in: src/action/request.ts:101

THE OFFERED-SET LAW lives here: a value outside the offered list
 refuses, naming the list, and the request stays open — a refused
 attempt costs nothing and the real answer still lands.

#### Parameters

##### value

`string`

##### by

[`Principal`](/api/index/type-aliases/Principal)

#### Returns

[`InputRequestSnapshot`](/api/index/interfaces/InputRequestSnapshot)

***

### decline()

> **decline**(`by`, `reason`): [`InputRequestSnapshot`](/api/index/interfaces/InputRequestSnapshot)

Defined in: src/action/request.ts:102

#### Parameters

##### by

[`Principal`](/api/index/type-aliases/Principal)

##### reason

`unknown`

#### Returns

[`InputRequestSnapshot`](/api/index/interfaces/InputRequestSnapshot)

***

### snapshot()

> **snapshot**(): [`InputRequestSnapshot`](/api/index/interfaces/InputRequestSnapshot)

Defined in: src/action/request.ts:95

#### Returns

[`InputRequestSnapshot`](/api/index/interfaces/InputRequestSnapshot)

***

### withdraw()

> **withdraw**(`reason`): [`InputRequestSnapshot`](/api/index/interfaces/InputRequestSnapshot)

Defined in: src/action/request.ts:104

The requester taking the question back.

#### Parameters

##### reason

`unknown`

#### Returns

[`InputRequestSnapshot`](/api/index/interfaces/InputRequestSnapshot)
