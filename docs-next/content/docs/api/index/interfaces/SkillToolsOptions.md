---
title: SkillToolsOptions
---

# Interface: SkillToolsOptions

Defined in: [src/serve/modes.ts:40](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L40)

## Extended by

- [`McpServerOptions`](/api/mcp/interfaces/McpServerOptions)

## Properties

### confirmHighEffect?

> `optional` **confirmHighEffect?**: `boolean`

Defined in: [src/serve/modes.ts:42](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L42)

Require confirm:true before firing high-effect steps/actions. Default true.

***

### source?

> `optional` **source?**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/serve/modes.ts:44](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L44)

Principal stamped on fires made through this port. Default 'agent'.
