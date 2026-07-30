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

Defined in: [src/serve/modes.ts:52](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L52)

Principal stamped on fires made through this port. Default 'agent'.

Leave it alone for a port a MODEL holds. Under `requireHumanApproval` the
gate holds agent fires and lets the app-self-report tier through, so a port
stamping `'user'` or `'system'` is a port whose fires are not gated — the
library says so out loud when you build one, and the confirm argument it
serves stops claiming a gate it does not have.
