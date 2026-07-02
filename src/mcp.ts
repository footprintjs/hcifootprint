/**
 * Per-edge MCP tool emission.
 *
 * footprint's toMCPTool() is one-tool-per-CHART with a permanent cache — the
 * wrong grain for an action space that changes on every available() call. This
 * follows the repo's own multi-tool precedent (the MCP triage socket example):
 * hand-shaped {name, description, inputSchema} descriptors, reusing only the
 * pure schema layer (detectSchema + normalizeSchema).
 *
 * Two-string-class invariant: `description` is ALWAYS the authored affordance
 * description. Runtime-resolved strings (DOM labels, user content) are data —
 * they never reach a descriptor, so attacker-controlled page text cannot
 * inject instructions into the planner's action space.
 */
import { detectSchema } from 'footprintjs';
import type { MCPToolDescription } from 'footprintjs';
import { normalizeSchema } from 'footprintjs/advanced';
import type { AvailableEdge, SkillGraphSpec } from './types.js';

const NO_PARAMS = { type: 'object', properties: {}, additionalProperties: false };

/** Appended (authored-class constant) so MCP-only planners see the step-up marker. */
const HIGH_EFFECT_SUFFIX = ' [high-effect: requires explicit confirmation]';

export function edgesToMCPTools(
  spec: SkillGraphSpec,
  edges: AvailableEdge[],
  opts?: { lossySchemas?: boolean },
): MCPToolDescription[] {
  return edges.map((edge) => ({
    name: sanitizeMCPName(`${spec.id}.${edge.affordanceId}`),
    description: edge.highEffect ? edge.description + HIGH_EFFECT_SUFFIX : edge.description,
    inputSchema:
      edge.schema === undefined
        ? structuredClone(NO_PARAMS)
        : gateSchema(edge.affordanceId, edge.schema, opts?.lossySchemas ?? false),
  })) as MCPToolDescription[];
}

function gateSchema(affordanceId: string, schema: unknown, lossy: boolean): object {
  const kind = detectSchema(schema);
  if (kind === 'zod') return normalizeSchema(schema as never) as object;
  // Clone: descriptors must never hand out live references into the spec —
  // an MCP host normalizing inputSchema in place would corrupt the graph.
  if (kind === 'json-schema') return structuredClone(schema) as object;
  // 'parseable' (yup/superstruct/...): validates payloads at fire() but cannot
  // be serialized to JSON Schema — emitting the raw validator would hand an
  // MCP client garbage. Fail loudly unless the caller opts into lossy output.
  if (!lossy) {
    throw new Error(
      `hcifootprint: affordance '${affordanceId}' has a 'parseable' schema (non-Zod validator). It validates ` +
        `payloads at fire() but cannot be serialized to JSON Schema for MCP. Declare a Zod or JSON-Schema ` +
        `schema, or pass { lossySchemas: true } to emit a permissive object schema.`,
    );
  }
  return { type: 'object' };
}

function sanitizeMCPName(name: string): string {
  return name.replace(/[^A-Za-z0-9_.-]/g, '_');
}
