---
title: DeclaredContextHandle
---

# Interface: DeclaredContextHandle

Defined in: [src/action/declared-context.ts:85](https://github.com/footprintjs/hcifootprint/blob/main/src/action/declared-context.ts#L85)

## Properties

### declaration

> `readonly` **declaration**: [`DeclaredContextDeclaration`](/api/index/interfaces/DeclaredContextDeclaration)

Defined in: [src/action/declared-context.ts:87](https://github.com/footprintjs/hcifootprint/blob/main/src/action/declared-context.ts#L87)

The declaration as captured (frozen; readers keep their identity).

## Methods

### entries()

> **entries**(): readonly [`DeclaredContextEntry`](/api/index/interfaces/DeclaredContextEntry)[]

Defined in: [src/action/declared-context.ts:89](https://github.com/footprintjs/hcifootprint/blob/main/src/action/declared-context.ts#L89)

Every standing entry, oldest invocation first. Empty once retired.

#### Returns

readonly [`DeclaredContextEntry`](/api/index/interfaces/DeclaredContextEntry)[]

***

### retire()

> **retire**(): `boolean`

Defined in: [src/action/declared-context.ts:94](https://github.com/footprintjs/hcifootprint/blob/main/src/action/declared-context.ts#L94)

Idempotent and final: stops the fold and frees the id. Returns whether
 this call was the one that retired it.

#### Returns

`boolean`

***

### skipped()

> **skipped**(): readonly [`DeclaredContextSkip`](/api/index/interfaces/DeclaredContextSkip)[]

Defined in: [src/action/declared-context.ts:91](https://github.com/footprintjs/hcifootprint/blob/main/src/action/declared-context.ts#L91)

Every verified transition a reader threw on or answered a non-string.

#### Returns

readonly [`DeclaredContextSkip`](/api/index/interfaces/DeclaredContextSkip)[]
