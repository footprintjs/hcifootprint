---
title: McpServerOptions
---

# Interface: McpServerOptions

Defined in: [src/serve/mcp-server.ts:34](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/mcp-server.ts#L34)

## Extends

- [`JourneyToolsOptions`](/api/index/interfaces/JourneyToolsOptions)

## Properties

### confirmHighEffect?

> `optional` **confirmHighEffect?**: `boolean`

Defined in: [src/serve/modes.ts:58](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L58)

Require confirm:true before firing high-effect steps/actions. Default true.

#### Inherited from

[`JourneyToolsOptions`](/api/index/interfaces/JourneyToolsOptions).[`confirmHighEffect`](/api/index/interfaces/JourneyToolsOptions#confirmhigheffect)

***

### journeyTools?

> `optional` **journeyTools?**: `"per-journey"` \| `"single"`

Defined in: [src/serve/modes.ts:100](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L100)

How journeys are offered in the TOOL channel. Default `'per-journey'` —
today's behaviour, byte for byte.

- `'per-journey'` — one `<graph>.journey.<id>` tool per DECLARED journey.
  Every journey is named and described in the channel a model selects from,
  and the array grows with the app.
- `'single'` — ONE `<graph>.journey` tool taking `journey: '<id>'`, the same
  shape `do_action` already has for actions. Journey DISCOVERY moves to the
  result channel (`whats_here` lists the journeys you can start from here),
  which is what this port already does for steps.

WHY THE OPTION EXISTS. Measured on a 60-page app declaring 57 journeys:
**85% of the 79,199-byte tool array was two authored constants repeated 57
times** — the step input schema and the usage sentence, byte-identical each
time. The per-journey information content is the authored `does`, 21–121
bytes of a ~1,331-byte marginal cost. In `'single'` the array is ~4,428
bytes and STAYS there, so the tool channel stops depending on how many
journeys an app declares — byte-stable across apps, not merely across turns.

WHAT IS NOT KNOWN, and it is the reason this is opt-in rather than the
default: whether a model SELECTS as well from one generic tool plus a list
as it does from N named, described tools is **unmeasured**. That is a
tool-selection quality question, not a byte-count one, and it is being
measured on a task grid before any default changes. Until then the default
is untouched and this mode is a choice you make with your eyes open.

BREAKING FOR NAMES, if you switch: a host matching on `<graph>.journey.<id>`
tool names sees one tool instead. Names that no longer exist are answered
`UNKNOWN_TOOL` with the list that does — never routed silently.

#### Inherited from

[`JourneyToolsOptions`](/api/index/interfaces/JourneyToolsOptions).[`journeyTools`](/api/index/interfaces/JourneyToolsOptions#journeytools)

***

### name?

> `optional` **name?**: `string`

Defined in: [src/serve/mcp-server.ts:36](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/mcp-server.ts#L36)

Server name advertised over MCP. Default: the graph id.

***

### settleWithinMs?

> `optional` **settleWithinMs?**: `number`

Defined in: [src/serve/mcp-server.ts:58](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/mcp-server.ts#L58)

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

Defined in: [src/serve/modes.ts:68](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L68)

Principal stamped on fires made through this port. Default 'agent'.

Leave it alone for a port a MODEL holds. Under `requireHumanApproval` the
gate holds agent fires and lets the app-self-report tier through, so a port
stamping `'user'` or `'system'` is a port whose fires are not gated — the
library says so out loud when you build one, and the confirm argument it
serves stops claiming a gate it does not have.

#### Inherited from

[`JourneyToolsOptions`](/api/index/interfaces/JourneyToolsOptions).[`source`](/api/index/interfaces/JourneyToolsOptions#source)

***

### version?

> `optional` **version?**: `string`

Defined in: [src/serve/mcp-server.ts:38](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/mcp-server.ts#L38)

Server version advertised over MCP. Default '0.1.0'.
