---
title: McpServerOptions
---

# Interface: McpServerOptions

Defined in: [src/serve/mcp-server.ts:33](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/mcp-server.ts#L33)

## Extends

- [`SkillToolsOptions`](/api/index/interfaces/SkillToolsOptions)

## Properties

### confirmHighEffect?

> `optional` **confirmHighEffect?**: `boolean`

Defined in: [src/serve/modes.ts:43](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L43)

Require confirm:true before firing high-effect steps/actions. Default true.

#### Inherited from

[`SkillToolsOptions`](/api/index/interfaces/SkillToolsOptions).[`confirmHighEffect`](/api/index/interfaces/SkillToolsOptions#confirmhigheffect)

***

### name?

> `optional` **name?**: `string`

Defined in: [src/serve/mcp-server.ts:35](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/mcp-server.ts#L35)

Server name advertised over MCP. Default: the graph id.

***

### source?

> `optional` **source?**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/serve/modes.ts:45](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L45)

Principal stamped on fires made through this port. Default 'agent'.

#### Inherited from

[`SkillToolsOptions`](/api/index/interfaces/SkillToolsOptions).[`source`](/api/index/interfaces/SkillToolsOptions#source)

***

### version?

> `optional` **version?**: `string`

Defined in: [src/serve/mcp-server.ts:37](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/mcp-server.ts#L37)

Server version advertised over MCP. Default '0.1.0'.
