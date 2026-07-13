# serve — LLM-facing emission (layer 3)

**Job:** turn the current slice into what a planner consumes: per-edge MCP tool descriptors (+ the synthetic `leave-skill` escape tool while a frame is open).

**Depends on:** `atom/` (+ footprintjs `detectSchema`/`normalizeSchema` for payload schemas).
**Used by:** `traverse/` (`session.toMCPTools()`); also callable directly over any edge list.

Rules this layer enforces:

- **Two string classes.** Descriptions are ALWAYS the authored strings (plus authored-constant markers like the high-effect suffix). Runtime text never enters a descriptor — the prompt-injection firewall, tested with a hostile-string test.
- **Never cached, never by reference.** Descriptors are regenerated per call (the action space changes every turn) and schemas are cloned on the way out (an MCP host mutating `inputSchema` must not corrupt the graph).
- **No silent garbage.** A non-Zod `parseable` validator can't serialize to JSON Schema — emission fails loudly unless `lossySchemas: true` opts into a permissive schema.

## modes.ts — Mode B: skills as fixed tools (D18, the default serving mode)

`skillsAsTools(session)` serves ONE tool per skill (static `{step, input,
confirm}` schema) plus three fixed generics (`whats_here`, `do_action`,
`why`) — and the tool array NEVER changes for the life of a conversation.
Disclosure rides the RESULT channel (`readySteps` data); the model acts by
re-calling the same skill tool with `{step}`. `whats_here {sinceVersion}`
narrates only the delta since the model's last look (the mixed-initiative
resync), and `why {key}` serves the causal backward slice (who produced this
state). The why text is DATA — it may carry committed values, so it rides
results like `producedFor()`, never a description. Consequences: prompt-cache stability (tools render
first; any tool-set change busts every cache tier) and plain-MCP
compatibility (no `tools/list_changed` required — any host works). Stated
trade-off: per-step inputs are validated at `fire()`, not by the API schema;
error results carry what was expected. One conversation = one mode.

This file consumes ONLY the public Session surface — a pure projection,
independently testable (`test/modes.test.ts`).

