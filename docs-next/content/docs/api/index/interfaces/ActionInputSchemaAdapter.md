---
title: ActionInputSchemaAdapter
---

# Interface: ActionInputSchemaAdapter

Defined in: [src/action/types.ts:479](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L479)

Synchronous enforcement port for declaration formats without their own
`.safeParse`/`.parse` method, such as JSON Schema plus an Ajv instance.

## Methods

### supports()

> **supports**(`schema`): `boolean`

Defined in: [src/action/types.ts:480](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L480)

#### Parameters

##### schema

`unknown`

#### Returns

`boolean`

***

### validate()

> **validate**(`schema`, `input`, `context`): [`ActionInputSchemaResult`](/api/index/type-aliases/ActionInputSchemaResult)

Defined in: [src/action/types.ts:481](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L481)

#### Parameters

##### schema

`unknown`

##### input

`unknown`

##### context

[`ActionInputSchemaContext`](/api/index/interfaces/ActionInputSchemaContext)

#### Returns

[`ActionInputSchemaResult`](/api/index/type-aliases/ActionInputSchemaResult)
