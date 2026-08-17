---
title: leaveJourneyTool
---

# Function: leaveJourneyTool()

> **leaveJourneyTool**(`spec`, `journeyId`): [`MCPToolDescription`](/api/index/interfaces/MCPToolDescription)

Defined in: [src/serve/mcp.ts:35](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/mcp.ts#L35)

Synthetic escape tool served whenever a journey frame is open — the acting
agent must always be able to collapse back to journey-level planning. The
description is an authored-class constant (two-string-class safe).

The emitted tool name is `<graph>.leave-journey`: one word on the wire too,
because a model reading `leave-skill` beside a `journey` vocabulary is being
told the library has two words for one thing.

## Parameters

### spec

[`NavigationGraphSpec`](/api/index/interfaces/NavigationGraphSpec)

### journeyId

`string`

## Returns

[`MCPToolDescription`](/api/index/interfaces/MCPToolDescription)
