---
title: WebMcpContext
---

# Interface: WebMcpContext

Defined in: [src/serve/webmcp.ts:5](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/webmcp.ts#L5)

The common registration surface of browser WebMCP implementations.

## Methods

### registerTool()

> **registerTool**(`tool`, `options`): `void` \| `Promise`\<`void`\>

Defined in: [src/serve/webmcp.ts:6](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/webmcp.ts#L6)

#### Parameters

##### tool

[`WebMcpTool`](/api/webmcp/interfaces/WebMcpTool)

##### options

###### signal

`AbortSignal`

#### Returns

`void` \| `Promise`\<`void`\>
