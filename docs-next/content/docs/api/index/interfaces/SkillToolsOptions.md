---
title: SkillToolsOptions
---

# Interface: SkillToolsOptions

Defined in: [src/serve/modes.ts:42](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L42)

## Extended by

- [`McpServerOptions`](/api/mcp/interfaces/McpServerOptions)

## Properties

### confirmHighEffect?

> `optional` **confirmHighEffect?**: `boolean`

Defined in: [src/serve/modes.ts:44](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L44)

Require confirm:true before firing high-effect steps/actions. Default true.

***

### source?

> `optional` **source?**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/serve/modes.ts:46](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L46)

Principal stamped on fires made through this port. Default 'agent'.
