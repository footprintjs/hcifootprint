---
title: ActionInputSchemaAdapter
---

# Interface: ActionInputSchemaAdapter

Defined in: [src/action/types.ts:802](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L802)

Synchronous enforcement port for declaration formats without their own
`.safeParse`/`.parse` method, such as JSON Schema plus an Ajv instance.

## Methods

### supports()

> **supports**(`schema`): `boolean`

Defined in: [src/action/types.ts:803](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L803)

#### Parameters

##### schema

`unknown`

#### Returns

`boolean`

***

### validate()

> **validate**(`schema`, `input`, `context`): [`ActionInputSchemaResult`](/api/index/type-aliases/ActionInputSchemaResult)

Defined in: [src/action/types.ts:804](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L804)

#### Parameters

##### schema

`unknown`

##### input

`unknown`

##### context

[`ActionInputSchemaContext`](/api/index/interfaces/ActionInputSchemaContext)

#### Returns

[`ActionInputSchemaResult`](/api/index/type-aliases/ActionInputSchemaResult)
