---
title: MCPToolDescription
---

# Interface: MCPToolDescription

Defined in: node\_modules/footprintjs/dist/esm/lib/runner/RunnableChart.d.ts:22

MCP tool description — shape required by the Model Context Protocol spec.

## Properties

### description

> **description**: `string`

Defined in: node\_modules/footprintjs/dist/esm/lib/runner/RunnableChart.d.ts:24

***

### inputSchema

> **inputSchema**: `JsonSchema`

Defined in: node\_modules/footprintjs/dist/esm/lib/runner/RunnableChart.d.ts:30

JSON Schema object describing the tool's input.
Always present — the MCP spec requires inputSchema even for tools with no parameters.
Defaults to `{ type: 'object', properties: {}, additionalProperties: false }`.

***

### name

> **name**: `string`

Defined in: node\_modules/footprintjs/dist/esm/lib/runner/RunnableChart.d.ts:23
