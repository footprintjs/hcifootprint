---
title: JourneyToolsOptions
---

# Interface: JourneyToolsOptions

Defined in: [src/serve/modes.ts:56](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L56)

## Extended by

- [`McpServerOptions`](/api/mcp/interfaces/McpServerOptions)

## Properties

### confirmHighEffect?

> `optional` **confirmHighEffect?**: `boolean`

Defined in: [src/serve/modes.ts:58](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L58)

Require confirm:true before firing high-effect steps/actions. Default true.

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
