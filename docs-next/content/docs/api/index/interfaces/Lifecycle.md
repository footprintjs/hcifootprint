---
title: Lifecycle
---

# Interface: Lifecycle

Defined in: [src/action/lifecycle.ts:40](https://github.com/footprintjs/hcifootprint/blob/main/src/action/lifecycle.ts#L40)

## Properties

### chart

> `readonly` **chart**: [`LifecycleChart`](/api/index/interfaces/LifecycleChart)

Defined in: [src/action/lifecycle.ts:41](https://github.com/footprintjs/hcifootprint/blob/main/src/action/lifecycle.ts#L41)

***

### initial

> `readonly` **initial**: `string`

Defined in: [src/action/lifecycle.ts:42](https://github.com/footprintjs/hcifootprint/blob/main/src/action/lifecycle.ts#L42)

## Methods

### assertMove()

> **assertMove**(`from`, `to`, `by?`): `void`

Defined in: [src/action/lifecycle.ts:46](https://github.com/footprintjs/hcifootprint/blob/main/src/action/lifecycle.ts#L46)

Refuses an illegal move with the legal ones named — never a boolean a
 caller can forget to check.

#### Parameters

##### from

`string`

##### to

`string`

##### by?

[`Principal`](/api/index/type-aliases/Principal)

#### Returns

`void`

***

### isTerminal()

> **isTerminal**(`state`): `boolean`

Defined in: [src/action/lifecycle.ts:43](https://github.com/footprintjs/hcifootprint/blob/main/src/action/lifecycle.ts#L43)

#### Parameters

##### state

`string`

#### Returns

`boolean`
