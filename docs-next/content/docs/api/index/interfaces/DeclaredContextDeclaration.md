---
title: DeclaredContextDeclaration
---

# Interface: DeclaredContextDeclaration

Defined in: [src/action/declared-context.ts:40](https://github.com/footprintjs/hcifootprint/blob/main/src/action/declared-context.ts#L40)

What one declared context folds, and how.

## Properties

### fold

> `readonly` **fold**: `"latest-per-key"`

Defined in: [src/action/declared-context.ts:50](https://github.com/footprintjs/hcifootprint/blob/main/src/action/declared-context.ts#L50)

***

### from

> `readonly` **from**: readonly [`DefinedAction`](/api/index/type-aliases/DefinedAction)[]

Defined in: [src/action/declared-context.ts:45](https://github.com/footprintjs/hcifootprint/blob/main/src/action/declared-context.ts#L45)

The actions whose VERIFIED evidence enters the context. Each must
 declare `settle.evidence`, all of the same kind.

***

### id

> `readonly` **id**: `string`

Defined in: [src/action/declared-context.ts:42](https://github.com/footprintjs/hcifootprint/blob/main/src/action/declared-context.ts#L42)

The context's own id — refused while a live context holds it.

***

### identity

> `readonly` **identity**: (`value`) => `string`

Defined in: [src/action/declared-context.ts:49](https://github.com/footprintjs/hcifootprint/blob/main/src/action/declared-context.ts#L49)

Which value this is — what a release names. App code, isolated.

#### Parameters

##### value

`unknown`

#### Returns

`string`

***

### key

> `readonly` **key**: (`value`) => `string`

Defined in: [src/action/declared-context.ts:47](https://github.com/footprintjs/hcifootprint/blob/main/src/action/declared-context.ts#L47)

Which slot a value fills — one entry per key. App code, isolated.

#### Parameters

##### value

`unknown`

#### Returns

`string`

***

### releasedBy?

> `readonly` `optional` **releasedBy?**: `object`

Defined in: [src/action/declared-context.ts:52](https://github.com/footprintjs/hcifootprint/blob/main/src/action/declared-context.ts#L52)

An action whose verified evidence names an identity to release.

#### action

> `readonly` **action**: [`DefinedAction`](/api/index/type-aliases/DefinedAction)

#### identity

> `readonly` **identity**: (`evidence`) => `string`

##### Parameters

###### evidence

`unknown`

##### Returns

`string`
