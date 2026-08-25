---
title: ActionInputSchemaAdapter
---

# Interface: ActionInputSchemaAdapter

Defined in: [src/action/types.ts:705](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L705)

Synchronous enforcement port for declaration formats without their own
`.safeParse`/`.parse` method, such as JSON Schema plus an Ajv instance.

## Methods

### supports()

> **supports**(`schema`): `boolean`

Defined in: [src/action/types.ts:706](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L706)

#### Parameters

##### schema

`unknown`

#### Returns

`boolean`

***

### validate()

> **validate**(`schema`, `input`, `context`): [`ActionInputSchemaResult`](/api/index/type-aliases/ActionInputSchemaResult)

Defined in: [src/action/types.ts:707](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L707)

#### Parameters

##### schema

`unknown`

##### input

`unknown`

##### context

[`ActionInputSchemaContext`](/api/index/interfaces/ActionInputSchemaContext)

#### Returns

[`ActionInputSchemaResult`](/api/index/type-aliases/ActionInputSchemaResult)
