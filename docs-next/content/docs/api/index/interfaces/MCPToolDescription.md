---
title: MCPToolDescription
---

# Interface: MCPToolDescription

Defined in: node\_modules/footprintjs/dist/esm/lib/runner/RunnableChart.d.ts:23

MCP tool description — shape required by the Model Context Protocol spec.

## Properties

### description

> **description**: `string`

Defined in: node\_modules/footprintjs/dist/esm/lib/runner/RunnableChart.d.ts:25

***

### inputSchema

> **inputSchema**: `JsonSchema`

Defined in: node\_modules/footprintjs/dist/esm/lib/runner/RunnableChart.d.ts:31

JSON Schema object describing the tool's input.
Always present — the MCP spec requires inputSchema even for tools with no parameters.
Defaults to `{ type: 'object', properties: {}, additionalProperties: false }`.

***

### name

> **name**: `string`

Defined in: node\_modules/footprintjs/dist/esm/lib/runner/RunnableChart.d.ts:24
