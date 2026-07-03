# serve — LLM-facing emission (layer 3)

**Job:** turn the current slice into what a planner consumes: per-edge MCP tool descriptors (+ the synthetic `leave-skill` escape tool while a frame is open).

**Depends on:** `atom/` (+ footprintjs `detectSchema`/`normalizeSchema` for payload schemas).
**Used by:** `traverse/` (`session.toMCPTools()`); also callable directly over any edge list.

Rules this layer enforces:

- **Two string classes.** Descriptions are ALWAYS the authored strings (plus authored-constant markers like the high-effect suffix). Runtime text never enters a descriptor — the prompt-injection firewall, tested with a hostile-string test.
- **Never cached, never by reference.** Descriptors are regenerated per call (the action space changes every turn) and schemas are cloned on the way out (an MCP host mutating `inputSchema` must not corrupt the graph).
- **No silent garbage.** A non-Zod `parseable` validator can't serialize to JSON Schema — emission fails loudly unless `lossySchemas: true` opts into a permissive schema.
