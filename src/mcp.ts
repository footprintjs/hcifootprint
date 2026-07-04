/**
 * hcifootprint/mcp — the OPTIONAL Model Context Protocol surface.
 *
 * Import from here (not the main entry) to expose a session as a real MCP
 * server. This subpath is the ONLY place `@modelcontextprotocol/sdk` — an
 * optional peer dependency — is imported, so the core entry stays zero-dep and
 * anyone who does not need MCP never pulls the SDK.
 *
 * ```ts
 * import { skillsAsTools } from 'hcifootprint';       // primitive — bind to any framework, zero deps
 * import { mcpServer }     from 'hcifootprint/mcp';    // full MCP server — needs the SDK peer dep
 * ```
 */
export { mcpServer } from './serve/mcp-server.js';
export type { McpServerOptions } from './serve/mcp-server.js';
