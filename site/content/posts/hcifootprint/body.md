<!--section:what-->

For decades we designed the interaction between a **human** and a **computer** — that's HCI. Now the
human isn't alone: an **agent** joins their side, acting for them. **HACI Footprint** is the layer for
that team — it turns your web app's interaction surface into a typed, traversable **skill graph** an
LLM agent can plan over and act on.

You describe the app the way you already picture it — pages, the containers inside them, and the
actions inside those — with `buildNavigationGraph('shop', { pages, skills })`. One sentence per
action doubles as its label and the tool description the model reads. In return the agent gets a map
with a **you-are-here** pin, so it only ever sees what is actually doable at the current cursor —
instead of re-reading a 100k-token DOM on every visit.

The reason it's safe to adopt: **you are not opening your backend to an agent — you are letting it
drive the frontend a human already can.** It acts *as the signed-in user*, through your own buttons
and handlers, inside exactly the capability envelope the user already has. No new endpoints, no new
grants, no new attack surface.

<!--section:why-->

An agent can already reach your app. The problem is *how* it operates one. Today it screenshots the
page and reasons over pixels, or dumps the DOM into the prompt and guesses at what does what, or
leans on hard-coded selectors that break on the next redesign. All three relearn your app from
scratch, every single turn — slow, fragile, and expensive.

But a returning human already carries a mental model: where things are, what leads where, what
they're allowed to do. Your app holds that same map. HACI Footprint hands it to the agent as **one
canonical, self-explaining record** — the [footprintjs](https://github.com/footprintjs/footPrint)
idea, applied to the frontend. Guards are serializable filters over projected state, so the graph
offers only what's fireable right now; produced content (search results, product names) rides a
strict **data** channel, never the instruction channel — a firewall against prompt injection,
proven in the [demo](https://github.com/footprintjs/hcifootprint-demo) by a product literally named
`IGNORE PREVIOUS INSTRUCTIONS…` that stays harmless everywhere.

<!--section:gap-->

You don't have to build the whole agentic experience up front. Ship a thin skill graph, then let
real demand tell you what to build next.

Your UI is the boundary of what an agent *can* do. When a user asks for something the UI **can't**
serve, HACI Footprint doesn't just fail — it records a **gap**: a token-lean, structured row (the
ask, the you-are-here position, what *was* available), wired to your telemetry via `session.gaps()`
and `session.onGap(row => …)`. Cluster those rows and you have a **demand-driven backlog** for your
agentic app.

A concrete one: two customers check out at the same moment; a race lets one order through and the
other fails. The loser asks the assistant *"why did mine fail?"* — but that reason is in your backend
logs, not on any button. The agent can't answer, so it files a gap. Now you know precisely what to
ship next: a small report, or a tool that reads the failure reason. **You grow the app by locating
the missing data, not by guessing at features.**

<!--section:coexist-->

HACI Footprint isn't tied to any agent framework — and it doesn't compete with Anthropic's Model
Context Protocol, it **rides on it**. `skillsAsTools(session)` gives you a fixed, MCP-shaped tool
surface — `tools()` + `call()` — to bind into LangGraph, LangChain, or a raw Anthropic loop directly.
The tool set never changes for the life of a conversation, so the prompt cache stays warm; what's
fireable *right now* travels inside each tool **result** (`readySteps`), not by rewriting the tool
array.

And it's a **real MCP server**, not just a shape. One line — `mcpServer(session)` from
`hcifootprint/mcp` — wraps the session in a standard `@modelcontextprotocol/sdk` `Server` with
`tools/list` + `tools/call`, and you pick the transport (stdio, SSE, HTTP). Any MCP host —
Claude Desktop, Cursor, LangGraph's MCP adapter — auto-discovers it and drives the **same live
session** the human is using. The SDK is an optional peer dependency isolated to that subpath, so
the core stays zero-dependency. Over MCP a high-effect step returns `judgment: needs-confirm`, and
the host gets human approval before calling again with `confirm: true` — portable human-in-the-loop,
no framework-specific pause/resume required.

<!--section:stays-true-->

The navigation graph is a **second artifact** you keep alongside the real app — so it drifts as the
app changes. The `hcifootprint/testing` subpath catches that drift in dev and CI, before production.
It adds **zero dependencies**, is tree-shakeable, and drives the **real** session, never a copy.

`lintGraph(graph)` is static — no app, no test code — flagging stale logic provable from the graph
alone: a control gated on state nothing produces, a guard that can never be true, a skill that can
never finish. `testApp(graph)` is *"Playwright for your interaction logic, minus the browser"*:
write mock handlers, drive the graph as a **user** (clicking) or as the **agent** (the real tool
path), and the honesty marker `effectVerified` flips false the moment a handler stops doing what the
graph declares. `checkGraph(graph, { initialState })` rolls both into a one-call health verdict.

That honesty is the throughline. Anything the runtime *derives* rather than *observes* is flagged —
`activation: 'assumed'`, `presence: 'unknown'`, `guardUnevaluated` — and every refused action returns
a *typed* reason (`BLOCKED_BY_OVERLAY`, `STILL_MOUNTING`, …) so the agent replans instead of
hallucinating. Under the hood every action lands in a real footprintjs commit log, so
`session.why(key)` gives a causal answer to *"why is the app in this state?"* with zero extra code.

**Get it:** `npm install hcifootprint` ·
[GitHub](https://github.com/footprintjs/hcifootprint) ·
[npm](https://www.npmjs.com/package/hcifootprint) ·
[dress-shop demo](https://github.com/footprintjs/hcifootprint-demo) ·
[the debugger](https://footprintjs.github.io/agentThinkingUI/). Sibling of
**[footprintjs](https://github.com/footprintjs/footPrint)** (backend logic) and
**[agentfootprint](https://github.com/footprintjs/agentfootprint)** (agents) — one self-explaining
trace substrate underneath.
