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

For a continuing task, choose the existing layer:

- [Session journeys](https://footprintjs.github.io/hcifootprint/docs/map/journeys) describe
  named flows across pages and model turns. Use the served ready/later steps, human pauses
  and settlement results to choose the next move; a journey is not an automatic batch executor.
- [Callable walks](https://footprintjs.github.io/hcifootprint/docs/actions/the-walk) use
  `beginWalk(runtime, 'agent')` for a known sequential plan. Each step rechecks its live offer;
  explicit `carry` uses an earlier declared `produces`. Render `onRow` manifests and retain
  interruption reasons. Replan or ask a person when a new decision is needed.
- For progress within one callable action, declare `settle.progress`, report actual stages
  with `reportProgress`, and subscribe through `invocation.progress`. Progress is not effect
  verification. A walk's `completed` means its invocations performed, not that every effect
  was verified. Callable walks are not automatically served through Session/MCP/WebMCP.

**Parallel actions require 3.2.0 or newer:** use
`walk.parallel(steps, { concurrency, onRow })` for
independently available actions/background work, with no `carry` between parallel items.
Its concurrency limit bounds running invocations; completion does not await every effect.
Read the [parallel guide](https://footprintjs.github.io/hcifootprint/docs/actions/the-walk#parallel-independent-actions)
for ordering, failures and interruption.

Keep navigation-dependent page-1 → page-2 work sequential. `node` is a binding label; neither
it nor different node names prove visibility or independence. The app must disconnect unmounted
controls, or report enabledness for the active page when hidden controls remain mounted.
Separate browser contexts exist only if the host provides them. Browser automation can also
batch: choose based on declared semantics and actual evidence, not an assumed model turn per click.

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

Use separate runtime/session and port lifetimes for each user or conversation. For Session
serving, keep input validation, execution and approval in the existing Session. Callable
bindings use their own principal port and validation; strict contract activation refuses
state or approval clauses that runtime cannot enforce. Do not switch to disclosure mode
merely to make a blocked flow run. Leave a model's port principal as `agent`; do not stamp it
`user` to bypass a refusal.
`confirm: true` alone is not proof of human approval: use `requireHumanApproval`
when enforcement is required, with the application's recorded decision.

A pending result is not completion. For Session serving, read `did_it_work` rather than
repeating the action. For callable invocations, distinguish `whenInvoked` from
`whenEffectSettled`; a handler return or closed progress stream is not a verified effect.
For Session results, `alreadyTrue` records declared verify conditions that held before firing.
It is not completion, proof of no change, or proof that a requested input was applied; the handler
may still write or fail. Read `effectStatus`, `outcome`, `outcomeNow` when present, and any error.
Keep typed refusals and unknown evidence visible. Browser observations may supply authoritative
adapter evidence when the app defines that contract; a click or visible change alone is not
automatically proof of business success.

## Validate the integration

Type-check actual imports against the installed release. Use
[`hcifootprint/testing`](https://footprintjs.github.io/hcifootprint/docs/reference/testing)
to exercise discovery, execution, refusal and settlement through the real
serving port. Check unmount and disposal for React or WebMCP integrations.
Import record types and readers from `foottrace`, their owner.
