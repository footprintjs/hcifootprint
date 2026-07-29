---
title: SkillToolsOptions
---

# Interface: SkillToolsOptions

Defined in: [src/serve/modes.ts:41](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L41)

## Extended by

- [`McpServerOptions`](/api/mcp/interfaces/McpServerOptions)

## Properties

### confirmHighEffect?

> `optional` **confirmHighEffect?**: `boolean`

Defined in: [src/serve/modes.ts:43](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L43)

Require confirm:true before firing high-effect steps/actions. Default true.

***

### source?

> `optional` **source?**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/serve/modes.ts:45](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L45)

Principal stamped on fires made through this port. Default 'agent'.
