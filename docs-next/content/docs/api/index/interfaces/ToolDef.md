---
title: ToolDef
---

# Interface: ToolDef

Defined in: [src/tree/types.ts:32](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L32)

A tool on a node. Only `does` is required — details may materialize at mount.

## Extended by

- [`RegisteredToolDef`](/api/index/interfaces/RegisteredToolDef)

## Properties

### binding?

> `optional` **binding?**: [`Binding`](/api/index/type-aliases/Binding)

Defined in: [src/tree/types.ts:36](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L36)

How to reach it on screen (optional — L0b actuation; handlers don't need it).

***

### confirm?

> `optional` **confirm?**: `boolean`

Defined in: [src/tree/types.ts:44](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L44)

Requires explicit confirmation (the high-effect gate).

***

### does

> **does**: `string`

Defined in: [src/tree/types.ts:34](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L34)

AUTHORED intent, one string two readers (consumer label = agent tool description).

***

### goTo?

> `optional` **goTo?**: `string`

Defined in: [src/tree/types.ts:42](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L42)

Page this tool claims to navigate to (a top-level page id).

***

### input?

> `optional` **input?**: `unknown`

Defined in: [src/tree/types.ts:46](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L46)

Payload contract: Zod, JSON Schema, or any .safeParse/.parse validator.

***

### role?

> `optional` **role?**: [`CanonicalRole`](/api/index/type-aliases/CanonicalRole)

Defined in: [src/tree/types.ts:47](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L47)

***

### when?

> `optional` **when?**: `WhereFilter`\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/tree/types.ts:38](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L38)

Availability guard over projected state (AND-composed with every ancestor `when`).

***

### writes?

> `optional` **writes?**: `string`[]

Defined in: [src/tree/types.ts:40](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L40)

State keys this tool claims to change.
