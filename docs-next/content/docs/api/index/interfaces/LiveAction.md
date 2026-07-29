---
title: LiveAction
---

# Interface: LiveAction

Defined in: [src/graph/sources/types.ts:81](https://github.com/footprintjs/hcifootprint/blob/main/src/graph/sources/types.ts#L81)

One action a live store publishes: WHERE it lives (node, plus instance for a
repeats card), WHAT it is (the RegisteredToolDef vocabulary mounts already
speak — does/handler/when/writes/goTo/…), and whether it is currently
clickable. `${node}.${name}` (+instance) is the action's IDENTITY across
snapshots — same key means same action.

## Extends

- [`RegisteredToolDef`](/api/index/interfaces/RegisteredToolDef)

## Properties

### binding?

> `optional` **binding?**: [`Binding`](/api/index/type-aliases/Binding)

Defined in: [src/tree/types.ts:36](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L36)

How to reach it on screen (optional — L0b actuation; handlers don't need it).

#### Inherited from

[`RegisteredToolDef`](/api/index/interfaces/RegisteredToolDef).[`binding`](/api/index/interfaces/RegisteredToolDef#binding)

***

### confirm?

> `optional` **confirm?**: `boolean`

Defined in: [src/tree/types.ts:44](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L44)

Requires explicit confirmation (the high-effect gate).

#### Inherited from

[`RegisteredToolDef`](/api/index/interfaces/RegisteredToolDef).[`confirm`](/api/index/interfaces/RegisteredToolDef#confirm)

***

### does

> **does**: `string`

Defined in: [src/tree/types.ts:34](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L34)

AUTHORED intent, one string two readers (consumer label = agent tool description).

#### Inherited from

[`RegisteredToolDef`](/api/index/interfaces/RegisteredToolDef).[`does`](/api/index/interfaces/RegisteredToolDef#does)

***

### enabled?

> `optional` **enabled?**: `boolean`

Defined in: [src/graph/sources/types.ts:89](https://github.com/footprintjs/hcifootprint/blob/main/src/graph/sources/types.ts#L89)

False = on screen but greyed out (flows to TOOL_DISABLED). Default true.

***

### goTo?

> `optional` **goTo?**: `string`

Defined in: [src/tree/types.ts:42](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L42)

Page this tool claims to navigate to (a top-level page id).

#### Inherited from

[`RegisteredToolDef`](/api/index/interfaces/RegisteredToolDef).[`goTo`](/api/index/interfaces/RegisteredToolDef#goto)

***

### handler?

> `optional` **handler?**: [`ToolHandler`](/api/index/type-aliases/ToolHandler)

Defined in: [src/traverse/nav-session.ts:69](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L69)

#### Inherited from

[`RegisteredToolDef`](/api/index/interfaces/RegisteredToolDef).[`handler`](/api/index/interfaces/RegisteredToolDef#handler)

***

### input?

> `optional` **input?**: `unknown`

Defined in: [src/tree/types.ts:46](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L46)

Payload contract: Zod, JSON Schema, or any .safeParse/.parse validator.

#### Inherited from

[`RegisteredToolDef`](/api/index/interfaces/RegisteredToolDef).[`input`](/api/index/interfaces/RegisteredToolDef#input)

***

### instance?

> `optional` **instance?**: `string`

Defined in: [src/graph/sources/types.ts:87](https://github.com/footprintjs/hcifootprint/blob/main/src/graph/sources/types.ts#L87)

Instance key when the action belongs to one card of a repeats container.

***

### name

> **name**: `string`

Defined in: [src/graph/sources/types.ts:85](https://github.com/footprintjs/hcifootprint/blob/main/src/graph/sources/types.ts#L85)

Leaf tool name (same segment law as every authored name).

***

### node

> **node**: `string`

Defined in: [src/graph/sources/types.ts:83](https://github.com/footprintjs/hcifootprint/blob/main/src/graph/sources/types.ts#L83)

Node path the action lives on (a page or declared container).

***

### role?

> `optional` **role?**: [`CanonicalRole`](/api/index/type-aliases/CanonicalRole)

Defined in: [src/tree/types.ts:47](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L47)

#### Inherited from

[`RegisteredToolDef`](/api/index/interfaces/RegisteredToolDef).[`role`](/api/index/interfaces/RegisteredToolDef#role)

***

### when?

> `optional` **when?**: `WhereFilter`\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/tree/types.ts:38](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L38)

Availability guard over projected state (AND-composed with every ancestor `when`).

#### Inherited from

[`RegisteredToolDef`](/api/index/interfaces/RegisteredToolDef).[`when`](/api/index/interfaces/RegisteredToolDef#when)

***

### writes?

> `optional` **writes?**: `string`[]

Defined in: [src/tree/types.ts:40](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L40)

State keys this tool claims to change.

#### Inherited from

[`RegisteredToolDef`](/api/index/interfaces/RegisteredToolDef).[`writes`](/api/index/interfaces/RegisteredToolDef#writes)
