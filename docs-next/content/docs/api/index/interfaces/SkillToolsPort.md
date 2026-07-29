---
title: SkillToolsPort
---

# Interface: SkillToolsPort

Defined in: [src/serve/modes.ts:70](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L70)

## Methods

### call()

> **call**(`name`, `args?`): [`ServeResult`](/api/index/type-aliases/ServeResult)

Defined in: [src/serve/modes.ts:74](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L74)

Route a tool_use by name. Unknown names return a structured error result.

#### Parameters

##### name

`string`

##### args?

`unknown`

#### Returns

[`ServeResult`](/api/index/type-aliases/ServeResult)

***

### tools()

> **tools**(): `MCPToolDescription`[]

Defined in: [src/serve/modes.ts:72](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L72)

The STATIC tool array — identical bytes for the life of the conversation.

#### Returns

`MCPToolDescription`[]
