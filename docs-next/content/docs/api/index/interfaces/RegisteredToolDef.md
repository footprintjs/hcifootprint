---
title: RegisteredToolDef
---

# Interface: RegisteredToolDef

Defined in: [src/traverse/nav-session.ts:68](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L68)

A tool declared at mount time. `does` is a registration-site source-code literal — still authored.

## Extends

- [`ToolDef`](/api/index/interfaces/ToolDef)

## Extended by

- [`LiveAction`](/api/index/interfaces/LiveAction)

## Properties

### binding?

> `optional` **binding?**: [`Binding`](/api/index/type-aliases/Binding)

Defined in: [src/tree/types.ts:36](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L36)

How to reach it on screen (optional — L0b actuation; handlers don't need it).

#### Inherited from

[`ToolDef`](/api/index/interfaces/ToolDef).[`binding`](/api/index/interfaces/ToolDef#binding)

***

### confirm?

> `optional` **confirm?**: `boolean`

Defined in: [src/tree/types.ts:44](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L44)

Requires explicit confirmation (the high-effect gate).

#### Inherited from

[`ToolDef`](/api/index/interfaces/ToolDef).[`confirm`](/api/index/interfaces/ToolDef#confirm)

***

### does

> **does**: `string`

Defined in: [src/tree/types.ts:34](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L34)

AUTHORED intent, one string two readers (consumer label = agent tool description).

#### Inherited from

[`ToolDef`](/api/index/interfaces/ToolDef).[`does`](/api/index/interfaces/ToolDef#does)

***

### goTo?

> `optional` **goTo?**: `string`

Defined in: [src/tree/types.ts:42](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L42)

Page this tool claims to navigate to (a top-level page id).

#### Inherited from

[`ToolDef`](/api/index/interfaces/ToolDef).[`goTo`](/api/index/interfaces/ToolDef#goto)

***

### handler?

> `optional` **handler?**: [`ToolHandler`](/api/index/type-aliases/ToolHandler)

Defined in: [src/traverse/nav-session.ts:69](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L69)

***

### input?

> `optional` **input?**: `unknown`

Defined in: [src/tree/types.ts:46](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L46)

Payload contract: Zod, JSON Schema, or any .safeParse/.parse validator.

#### Inherited from

[`ToolDef`](/api/index/interfaces/ToolDef).[`input`](/api/index/interfaces/ToolDef#input)

***

### role?

> `optional` **role?**: [`CanonicalRole`](/api/index/type-aliases/CanonicalRole)

Defined in: [src/tree/types.ts:47](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L47)

#### Inherited from

[`ToolDef`](/api/index/interfaces/ToolDef).[`role`](/api/index/interfaces/ToolDef#role)

***

### when?

> `optional` **when?**: `WhereFilter`\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/tree/types.ts:38](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L38)

Availability guard over projected state (AND-composed with every ancestor `when`).

#### Inherited from

[`ToolDef`](/api/index/interfaces/ToolDef).[`when`](/api/index/interfaces/ToolDef#when)

***

### writes?

> `optional` **writes?**: `string`[]

Defined in: [src/tree/types.ts:40](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L40)

State keys this tool claims to change.

#### Inherited from

[`ToolDef`](/api/index/interfaces/ToolDef).[`writes`](/api/index/interfaces/ToolDef#writes)
