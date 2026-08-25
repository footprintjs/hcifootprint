---
title: ActionInputSchemaAdapter
---

# Interface: ActionInputSchemaAdapter

Defined in: [src/action/types.ts:728](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L728)

Synchronous enforcement port for declaration formats without their own
`.safeParse`/`.parse` method, such as JSON Schema plus an Ajv instance.

## Methods

### supports()

> **supports**(`schema`): `boolean`

Defined in: [src/action/types.ts:729](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L729)

#### Parameters

##### schema

`unknown`

#### Returns

`boolean`

***

### validate()

> **validate**(`schema`, `input`, `context`): [`ActionInputSchemaResult`](/api/index/type-aliases/ActionInputSchemaResult)

Defined in: [src/action/types.ts:730](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L730)

#### Parameters

##### schema

`unknown`

##### input

`unknown`

##### context

[`ActionInputSchemaContext`](/api/index/interfaces/ActionInputSchemaContext)

#### Returns

[`ActionInputSchemaResult`](/api/index/type-aliases/ActionInputSchemaResult)
