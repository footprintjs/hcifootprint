---
name: hcifootprint-adoption
description: Add hcifootprint to an existing web app so agents can discover and execute declared UI actions through direct tools, MCP, or browser WebMCP. Use for app integration rather than changes to the library itself.
---

Use the application's existing routes, controls, handlers and permissions.

Before coding, inspect the installed package version and exports. Read the
[maintained API guide](https://github.com/footprintjs/hcifootprint/blob/main/llms.txt).
Its version and import inventory are generated from the repository's package.json;
installed declarations take precedence when the application uses an older release.
Do not upgrade the application's dependencies unless the task calls for it.

Start with the [quick start](https://footprintjs.github.io/hcifootprint/docs/get-started/quick-start)
and [adoption ladder](https://footprintjs.github.io/hcifootprint/docs/get-started/adoption-ladder).

## Connect the app

Reuse route, journey and live-action sources where available. For Session serving,
connect existing handlers with `registerActions` or `fromLiveStore`. Report actual
page and state changes through `sync` and `updateState`.

Callable `defineAction`/`ActionRuntime` bindings are a separate surface: they do
not automatically become Session affordances or served tools. Read the
[action-binding guide](https://footprintjs.github.io/hcifootprint/docs/actions/live-bindings)
when the task needs those bindings.

Choose the host boundary the application needs:

- Direct integration: `serveToAgent(session)`, then `tools()` and `call()`.
- MCP: `mcpServer` from `hcifootprint/mcp`; the MCP SDK is an optional peer.
- Browser WebMCP: `registerWebMcpTools` from `hcifootprint/webmcp`, with an
  explicitly supplied host context and owner `AbortSignal`. Read the
  [compatibility and lifecycle guidance](https://footprintjs.github.io/hcifootprint/docs/reference/webmcp)
  before registering tools, especially from a React effect.

For large action lists, [bounded reads](https://footprintjs.github.io/hcifootprint/docs/map/modes#bounded-action-rows)
use optional `actionProjection.maxBytes`. This caps the serialized actions array
only, preserving complete rows and disclosing omissions. Follow `nextCursor`;
restart a read when its cursor is stale. This is not a cap on total response
bytes, CPU work or model tokens. Default serving remains unchanged.

## Preserve the application's meaning

Use a separate session and port for each user or conversation. Keep input
validation, execution and approval in the existing Session. Leave a model's
port principal as `agent`; do not stamp it `user` to bypass a refusal.
`confirm: true` alone is not proof of human approval: use `requireHumanApproval`
when enforcement is required, with the application's recorded decision.

A pending result is not completion. Read `did_it_work` rather than repeating
the action. Keep typed refusals and unknown evidence visible.

## Validate the integration

Type-check actual imports against the installed release. Use
[`hcifootprint/testing`](https://footprintjs.github.io/hcifootprint/docs/reference/testing)
to exercise discovery, execution, refusal and settlement through the real
serving port. Check unmount and disposal for React or WebMCP integrations.
Import record types and readers from `foottrace`, their owner.
