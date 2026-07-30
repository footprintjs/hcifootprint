---
title: McpServerOptions
---

# Interface: McpServerOptions

Defined in: [src/serve/mcp-server.ts:35](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/mcp-server.ts#L35)

## Extends

- [`SkillToolsOptions`](/api/index/interfaces/SkillToolsOptions)

## Properties

### confirmHighEffect?

> `optional` **confirmHighEffect?**: `boolean`

Defined in: [src/serve/modes.ts:49](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L49)

Require confirm:true before firing high-effect steps/actions. Default true.

#### Inherited from

[`SkillToolsOptions`](/api/index/interfaces/SkillToolsOptions).[`confirmHighEffect`](/api/index/interfaces/SkillToolsOptions#confirmhigheffect)

***

### name?

> `optional` **name?**: `string`

Defined in: [src/serve/mcp-server.ts:37](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/mcp-server.ts#L37)

Server name advertised over MCP. Default: the graph id.

***

### settleWithinMs?

> `optional` **settleWithinMs?**: `number`

Defined in: [src/serve/mcp-server.ts:59](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/mcp-server.ts#L59)

How long a `tools/call` that FIRED something waits for the app to finish
before it answers. Default 250.

This is the ONE place in the library where waiting is allowed: a tool call
is already an async turn, and the model is going to ask "did it work?"
anyway. Settle inside the ceiling and the result carries the final word;
miss it and `effectStatus: 'pending'` stands, with `did_it_work` named as
the next call. Nothing is ever guessed at the boundary — the ceiling
decides how long to wait, never what the answer is.

Raise it for an app whose handlers talk to a slow backend.

`0` is the SHORTEST ceiling, not an off switch: a settlement already in
hand — or one a handler reports in the same microtask turn — still wins the
race and is still folded in, because the timer is a macrotask. There is no
way to turn the fold off, deliberately: withholding an answer the session
is already holding would be the only thing dishonest here.

***

### source?

> `optional` **source?**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/serve/modes.ts:59](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L59)

Principal stamped on fires made through this port. Default 'agent'.

Leave it alone for a port a MODEL holds. Under `requireHumanApproval` the
gate holds agent fires and lets the app-self-report tier through, so a port
stamping `'user'` or `'system'` is a port whose fires are not gated — the
library says so out loud when you build one, and the confirm argument it
serves stops claiming a gate it does not have.

#### Inherited from

[`SkillToolsOptions`](/api/index/interfaces/SkillToolsOptions).[`source`](/api/index/interfaces/SkillToolsOptions#source)

***

### version?

> `optional` **version?**: `string`

Defined in: [src/serve/mcp-server.ts:39](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/mcp-server.ts#L39)

Server version advertised over MCP. Default '0.1.0'.
