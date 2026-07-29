---
title: mcpServer
---

# Function: mcpServer()

> **mcpServer**(`session`, `opts?`): `Server`

Defined in: [src/serve/mcp-server.ts:61](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/mcp-server.ts#L61)

Build an MCP `Server` backed by a live InteractionSession. Attach any
transport with `server.connect(transport)`.

## Parameters

### session

[`Session`](/api/index/classes/Session)

### opts?

[`McpServerOptions`](/api/mcp/interfaces/McpServerOptions)

## Returns

`Server`
