---
title: leaveSkillTool
---

# Function: leaveSkillTool()

> **leaveSkillTool**(`spec`, `skillId`): `MCPToolDescription`

Defined in: [src/serve/mcp.ts:30](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/mcp.ts#L30)

Synthetic escape tool served whenever a skill frame is open — the acting
agent must always be able to collapse back to skill-level planning. The
description is an authored-class constant (two-string-class safe).

## Parameters

### spec

[`SkillGraphSpec`](/api/index/interfaces/SkillGraphSpec)

### skillId

`string`

## Returns

`MCPToolDescription`
