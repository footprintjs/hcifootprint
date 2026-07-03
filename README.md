# HCIFootprint

**Turn your web app into a tool an LLM can drive — MCP-shaped, no backend, and without exposing your state or handlers up front.**

You describe your app the way you already picture it — pages, tabs, modals, and the actions inside them. HCIFootprint serves that to an LLM as a fixed set of tools and gives the model a map with a *you-are-here* pin, so it navigates and acts through your app's own functions instead of re-reading a 100k-token DOM at every step.

> npm package: `hcifootprint` (npm names are lowercase); prose name: **HCIFootprint**.

> **Status: experimental v0.** The headless core — author the graph, drive it, serve it as tools, trace every step — works and is fully tested (192 tests). The browser adapter that auto-wires a live DOM (a React hook + DOM sensor/actuation) is on the roadmap; today you connect it with a few lines, as the [dress-shop demo](https://github.com/footprintjs/hcifootprint-demo) does.

## Why

An LLM driving a web app today re-reads a 10k–100k-token DOM every step and picks from a flat tool list that has no idea where the user is or what is possible right now. That is slow, expensive, and error-prone. HCIFootprint changes the shape of the problem:

- **The model gets a map, not a DOM dump.** It sees the handful of actions that are actually available at the current position — each with a one-line description and evidence for why it is offered.
- **The tool list never changes.** Actions are served as fixed, MCP-shaped tools (one per task), so the prompt cache stays warm across the whole conversation and it works with any MCP host — no dynamic-tool support required.
- **It acts through your app, as the signed-in user.** Firing an action runs your own handler. No new backend, no new permissions — the agent inherits exactly what the user can already do.
- **It is honest about what it can't see.** Anything the runtime derives rather than observes is flagged; every refused action returns a typed reason and is logged, so the agent replans instead of hallucinating.
- **Untrusted content can never become instructions.** Page text and user content ride a strict data channel, never the planner's instruction channel — a firewall against prompt injection.

Under the hood every action lands in a real [footprintjs](https://github.com/footprintjs/footPrint) commit log, so you can ask *"why is the app in this state?"* and get a causal answer about a UI session with zero extra code.

HCIFootprint is the third sibling of the footprintjs ecosystem: **footprintjs** explains backend logic, **agentfootprint** explains agents, **HCIFootprint** turns the human-computer interaction surface into something an agent can drive — one trace substrate underneath.

## See it

The [**dress-shop demo**](https://github.com/footprintjs/hcifootprint-demo) is a real storefront (catalog, filters, cart, checkout) with a shopping assistant docked beside it. Both drive the *same* live session: you shop by clicking, or you ask the assistant *"find me a red dress under $150 and buy it"* and watch the store navigate itself and pause for your approval before placing the order — all through the app's own handlers, zero backend changes.

## Quick start — three steps

**1. Describe the app** as the tree you already picture — pages, the containers inside them, and the actions inside those. Each action needs one sentence; that sentence is both your label and the tool description the LLM reads.

```ts
import { appMap } from 'hcifootprint';

const map = appMap('shop', {
  pages: {
    catalog: {
      tools: {
        'search': { does: 'Search dresses by name or color' },
        'add-to-cart': { does: 'Add the open dress to the cart', when: { authenticated: { eq: true } } },
      },
    },
    checkout: {
      modals: {
        'confirm-order': { tools: { 'place-order': { does: 'Place the order', confirm: true } } },
      },
    },
  },
  skills: {
    purchase: { does: 'Buy a dress end to end', steps: ['add-to-cart', 'place-order'] },
  },
});
```

**2. Connect it** to your running app — no need to hand over state or handlers up front. Components register what they have *when they render*: your store updates flow in, your existing functions bind by reference, and the router owns the page.

```ts
const session = map.createSession();

// in the component that renders the catalog:
const handle = session.mount('catalog', {
  handlers: { 'search': (input) => shop.search(input.query) },  // your own function
});
// …and session.updateState(delta) on store changes, session.sync(page) on navigation.
```

**3. Serve it to the LLM** as a fixed set of MCP-shaped tools. The tool list never changes; what is doable *right now* arrives inside each tool result.

```ts
import { skillsAsTools } from 'hcifootprint';

const port = skillsAsTools(session);
port.tools();                          // static tool array — one per skill + whats_here / do_action
port.call('shop.skill.purchase', {});  // → { readySteps, judgment, youAreOn, ... }
```

That's the whole loop: **author → connect → serve.** The agent plans over skills, sees only the actions available at the current position, and acts through your own handlers — with the human able to approve high-effect steps.

## The navigation graph — in depth

`appMap()` (shown in the Quick start) is the recommended authoring surface. It
takes the full container tree — pages with **areas** (things shown together),
**tabs** (one shown at a time), and **modals** (overlays) — and a tool needs
only one `does` sentence to exist; binding, guard, handler, and payload schema
can all arrive later, at mount:

```ts
// in the component that renders the filter rail:
const handle = session.mount('catalog.filter-rail', {
  handlers: { 'set-color': (input) => setColor(input.color) },  // your own function, by reference
  tools: { 'clear-color': { does: 'Remove the color filter', handler: clearColor } }, // or declare on the spot
});
// on unmount:
handle.release();
```

Three words carry meaning; everything else is just structure. A `modals`
entry masks the rest of the page while it is shown, and closing it restores
everything — no state machine. A `tabs` group shows at most one child at a
time. `repeats: true` marks a template (order cards, product tiles) that
serves ONE tool with an instance key instead of one tool per card.

Everything the runtime cannot see, it says so instead of guessing. Edges
carry markers like `activation: 'assumed'`, `presence: 'unknown'`, and
`guardUnevaluated` (a guard over state you never reported is served WITH the
marker, not silently hidden). Refused fires return typed reasons —
`BLOCKED_BY_OVERLAY`, `NODE_NOT_VISIBLE`, `STILL_MOUNTING` (retriable) — and
every refusal lands in the gap ledger. When several kept-mounted tabs are
visible at once and no signal says which, the session serves all of them
flagged rather than guessing a winner; `session.show(path)` is the one-line
upgrade.

The v1 `skillGraph()` builder keeps working forever — it is the one-level
version of the same graph.

## Serving the agent: skills as fixed tools (Mode B) — in depth

The tool array an LLM sees never changes: one tool per skill plus
`whats_here` and `do_action`. What is fireable right now arrives inside each
tool RESULT (`readySteps`), and the model acts by calling the same skill tool
again with `{ step }`:

```ts
const port = skillsAsTools(session);
port.tools();                          // static — identical bytes every turn
port.call('shop.skill.purchase', {});  // → { readySteps, judgment, youAreOn, ... }
port.call('shop.skill.purchase', { step: 'catalog.add-to-cart', input: { productId: 'p1' } });
```

Because the tool set is fixed, the prompt cache stays warm for the whole
conversation, and the library works as a plain MCP server with ANY host — no
dynamic-tool support required. High-effect steps stop at `needs-confirm` and
are never auto-crossed.

**Actions can hand data back.** When a step's handler returns something (search
results, a looked-up record), that value rides the tool result — sanitized, on
the data channel — so the agent can read the ids it needs for the next step
(pick a `dressId` from the search results, then open it) instead of guessing.
Read it with `session.producedFor(transitionId)`.

## The atom

```
Affordance  = binding × guard × effect × schema     (the static capability)
Transition  = cause × payload × outcome             (each occurrence)
```

- **binding** — how to reach the app surface. ARIA role + accessible name first (never CSS classes), with `keychord` and `programmatic` escapes for shortcuts and canvas surfaces.
- **guard** — a serializable filter over projected state (`{ cartCount: { gt: 0 } }`). Evaluated by footprint's pure evidence-emitting evaluator; it filters what is *offered*.
- **effect** — a claim about the app's handler. Every settled transition carries `effectVerified: true | false | 'unobservable'` — checked as *declared write keys present in the settled delta* (values, extra writes, and navigation claims are not yet verified; navigation hops are flagged `toNodeClaimed` until a router tap confirms).
- **schema** — the payload contract (Zod, JSON Schema, or any `.safeParse` validator), so a planner can fill forms without reading the DOM.
- **cause** — `fired(affordance, principal)` or `stimulus(kind)`. System-initiated motion (session expiry, server push) is a first-class recorded transition with `principal: 'system'`.

## On-demand disclosure: skills first, tools on commit

The token win is two-level. The planner sees one line per skill; only after it commits does the tool level open — and only that skill's currently-fireable steps:

```ts
session.availableSkills();          // one line per skill: description + feasibility
session.commitSkill('purchase');    // opens a skill frame (rejects if the precondition fails)
session.toMCPTools();               // NOW serves only the frame's fireable steps
                                    // + escape tools: authored cancel/back roles + a synthetic leave-skill
session.skillPlan('purchase');      // the DERIVED dependency DAG with live status:
                                    //   add-to-cart: ready · go-to-cart: blocked on cartCount · …
session.leaveSkill();               // collapse back to skill-level planning
```

Step dependencies are **computed, never authored**: step B depends on step A whenever A's declared `effect.writes` overlap B's guard keys — the guard×effect atoms already encode the ordering, so the plan can't drift from the graph. If the world breaks the skill mid-flow (the user logs out in another tab), the frame is **demoted** automatically: disclosure re-collapses to skill level and the agent replans. A step guard failing never demotes — that's just "do the earlier step first."

## The context brief: what happened while the LLM wasn't looking

Chat turns interleave with real clicks. Each turn, inject the delta instead of re-explaining the world:

```ts
const brief = session.contextBrief({ sinceVersion: lastTurnVersion });
```

```
You are on: cart.
Open skill: purchase — Buy the items currently in the cart (1/4 steps done).
Since version 7 (now 12):
  • agent fired add-to-cart — Add a product to the cart
  • user fired go-to-cart — Open the shopping cart (catalog → cart)
  • system push changed: notifications
Pending: none.
Available now: proceed-to-checkout, go-home, leave-skill.
```

The text is built from authored strings and structural facts only — state **values** and payloads never enter it (key *names* do), so the prompt-injection firewall extends to history, not just tools. Honesty flags ride along: `[awaiting app state]`, `[navigation claimed, unconfirmed]`, `[rolled-back]`, demotion notes, unverified sync hops.

## Honesty rules (load-bearing)

- **Provenance is accountability for cooperating agents, not a security boundary.** An agent driving the browser like a human is indistinguishable from one at the DOM. Route agents through `fire(edgeId, { source: 'agent' })`; enforce high-effect actions server-side.
- **Two string classes.** Authored descriptions are the only text served to a planner. Runtime strings (DOM labels, user content) are data — attacker-controlled page text cannot inject instructions into the action space. Tested.
- **Guards re-evaluate at fire time; `expectedVersion` rejects stale plans.** Plan-time availability is advisory.
- **MCP descriptors carry no version token.** A pure-MCP consumer cannot join the concurrency protocol — the MCP host should call `available()` itself and pass `expectedVersion` when firing. Guard evidence (`actualSummary`) and validation `issues` are runtime-data channels: treat them as data, never instructions.

## Roadmap

- Browser adapter: MutationObserver binding resolver, router/store taps, Web Worker graph host with a measured main-thread budget.
- React adapter (`useMount`) + DOM actuation adapter (the L0b rung: native-setter + real events, option discovery from rendered elements).
- Route-tree derivation (Next.js / React Router) so the page skeleton is generated, not authored.
- CI `verifyBindings()` — walk every authored edge headlessly and fail the build when a binding no longer resolves.
- Cross-origin boundary nodes (payment iframes, OAuth popups) — journeys that leave the observable window (D20).
- Frame suspend/resume across navigation (v0 frames are commit / leave / auto-demote; suspending a frame while the user wanders and re-validating on return is next).
- Fire-time provenance anchoring: guard-read provenance is currently recorded at settlement, so with several transitions pending at once, a causal slice can attribute a guard read to a writer that landed between fire and settle. Fire-time evidence on the record is always correct; prefer it when they disagree.

## Development

```bash
npm install
npm test          # vitest
npm run typecheck # src + tests
npm run build
```

Depends on `footprintjs` ≥ 9.10 (`evaluateFilter` / `normalizeSchema` exports).

## License

MIT
