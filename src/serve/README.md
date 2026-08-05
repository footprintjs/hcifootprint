# serve — LLM-facing emission (layer 3)

**Job:** turn the current slice into what a planner consumes: per-edge MCP tool descriptors (+ the synthetic `leave-journey` escape tool while a frame is open).

**Depends on:** `atom/` (+ footprintjs `detectSchema`/`normalizeSchema` for payload schemas).
**Used by:** `traverse/` (`session.toMCPTools()`); also callable directly over any edge list.

Rules this layer enforces:

- **Two string classes.** Descriptions are ALWAYS the authored strings (plus authored-constant markers like the high-effect suffix). Runtime text never enters a descriptor — the prompt-injection firewall, tested with a hostile-string test.
- **Never cached, never by reference.** Descriptors are regenerated per call (the action space changes every turn) and schemas are cloned on the way out (an MCP host mutating `inputSchema` must not corrupt the graph).
- **No silent garbage.** A non-Zod `parseable` validator can't serialize to JSON Schema — emission fails loudly unless `lossySchemas: true` opts into a permissive schema.

## modes.ts — Mode B: journeys as fixed tools (D18, the default serving mode)

`serveToAgent(session)` serves ONE tool per journey (static `{step, input,
confirm}` schema) plus three fixed generics (`whats_here`, `do_action`,
`why`) — and the tool array NEVER changes for the life of a conversation.
Disclosure rides the RESULT channel (`readySteps` data); the model acts by
re-calling the same journey tool with `{step}`. `whats_here {sinceVersion}`
narrates only the delta since the model's last look (the mixed-initiative
resync), and `why {key}` serves the causal backward slice (who produced this
state). The why text is DATA — it may carry committed values, so it rides
results like `producedFor()`, never a description. Consequences: prompt-cache stability (tools render
first; any tool-set change busts every cache tier) and plain-MCP
compatibility (no `tools/list_changed` required — any host works). Stated
trade-off: per-step inputs are validated at `fire()`, not by the API schema;
error results carry what was expected. One conversation = one mode.

Two things are scoped to the POSITION rather than to the declaration, and both
were measured before they were changed (a 60-page app declaring 57 journeys):

- `whats_here` lists the journeys whose FIRST STEP is available here
  (`AvailableJourney.entryAvailable`, not `preconditionPassed`), and discloses
  what it left out — `journeysElsewhere: n` plus the sentence naming `routeTo`.
  The un-scoped list was 100% of the position block's growth (382 → 8,651 bytes).
  The OPEN journey is always listed. `test/journeys-you-can-start.test.ts`.
- `serveToAgent(session, { journeyTools: 'single' })` — opt-in, default
  untouched byte for byte — serves ONE `<graph>.journey` tool taking
  `journey: '<id>'` instead of N. At 57 journeys the array was 79,199 bytes,
  **85% of it two authored constants repeated 57×**. Tool-SELECTION quality
  under one generic tool is UNMEASURED, which is why the default does not move.
  `test/one-journey-tool.test.ts`.

This file consumes ONLY the public Session surface — a pure projection,
independently testable (`test/modes.test.ts`).

