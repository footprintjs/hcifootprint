---
title: registerWebMcpTools
---

# Function: registerWebMcpTools()

> **registerWebMcpTools**(`port`, `context`, `options?`): `Promise`\<[`WebMcpRegistration`](/api/webmcp/interfaces/WebMcpRegistration)\>

Defined in: [src/serve/webmcp.ts:44](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/webmcp.ts#L44)

Register a fixed serving port with an explicitly supplied browser WebMCP context.

Pass the context your browser exposes, rather than relying on a global here:
Lightpanda uses navigator.modelContext; the October 2026 draft uses
document.modelContext. Both synchronous and asynchronous registration work.

Execution delegates directly to the supplied port. Its guards, principals,
confirmations and settlement policy remain authoritative. A pending result
remains pending: the caller uses the same did_it_work tool the port serves.
Registration and disposal never call a browser's requestUserInteraction.

Tools become callable only after every registration succeeds. Failure aborts
this registration group, without unregistering another owner's tools. A host
must honor the registration signal to remove its listings; even if it retains
an old callback, that callback cannot dispatch after disposal.

## Parameters

### port

[`JourneyToolsPort`](/api/index/interfaces/JourneyToolsPort)

### context

[`WebMcpContext`](/api/webmcp/interfaces/WebMcpContext)

### options?

[`WebMcpOptions`](/api/webmcp/interfaces/WebMcpOptions) = `{}`

## Returns

`Promise`\<[`WebMcpRegistration`](/api/webmcp/interfaces/WebMcpRegistration)\>
