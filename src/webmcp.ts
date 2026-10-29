/**
 * hcifootprint/webmcp — optional browser registration over an existing serving port.
 * No browser globals are read on import and no MCP SDK is loaded.
 */
export { registerWebMcpTools } from './serve/webmcp.js';
export type {
  WebMcpContext,
  WebMcpOptions,
  WebMcpRegistration,
  WebMcpTool,
} from './serve/webmcp.js';
