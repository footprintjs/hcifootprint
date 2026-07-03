# HCIFootprint

Turn a web app's interaction surface into a typed, traversable skill graph an LLM can plan over.

> npm package: `hcifootprint` (npm names are lowercase); prose name: **HCIFootprint**.

> **Status: experimental v0.** The headless core (graph builder + traversal driver + trace integration) works and is fully tested. The browser layer (DOM binding resolver, router/store taps, Web Worker host) is not built yet.

## The idea

An LLM driving a web app today re-reads a 10k–100k-token DOM at every step and picks from a flat list of tools that knows nothing about where the user is. HCIFootprint gives the model a map with a you-are-here pin instead:

- You describe your app once as **pages**, **affordances** (things that can be done, with guards saying when), and **skills** (multi-step tasks).
- A **session** tracks where the user or agent currently is and serves `available()` — only the handful of actions whose guards pass right now, each with evidence explaining why.
- `fire()` applies an action with **provenance** (who did it: user, agent, system) and opt-in optimistic concurrency: pass `expectedVersion` from `available()` and an agent planning on a stale view is rejected and replans instead of misfiring. Guards are re-checked at fire time either way.
- `sync()` reconciles the cursor when the world moves without an offered action (back button, deep link, server redirect) — recorded honestly, never patched over in silence.

Every **settled** transition lands in a real [footprintjs](https://github.com/footprintjs/footPrint) commit log (pending and rejected ones live only in the interaction log — their effects never touched state), so footprint's whole post-hoc toolchain — `causalChain`, `sliceForKey`, `arrayProvenance` — answers "why is the app in this state?" about a UI session with zero new query code.

HCIFootprint is the third sibling of the footprintjs ecosystem: **footprintjs** explains backend logic, **agentfootprint** explains agents, **HCIFootprint** explains the human-computer interaction surface — one trace substrate underneath.

## Quick start

```ts
import { skillGraph } from 'hcifootprint';

const app = skillGraph('shop')
  .page('catalog', { route: '/products' })
  .page('cart', { route: '/cart' })
  .affordance('add-to-cart', {
    on: 'catalog',
    description: 'Add a product to the cart',
    binding: { kind: 'element', locator: { role: 'button', name: 'Add to cart' } },
    guard: { authenticated: { eq: true } },       // offered only when this passes
    effect: { writes: ['cart', 'cartCount'] },    // a CLAIM, verified at settlement
    schema: { type: 'object', properties: { productId: { type: 'string' } }, required: ['productId'] },
  })
  .affordance('go-to-cart', {
    on: 'catalog',
    description: 'Open the shopping cart',
    binding: { kind: 'element', locator: { role: 'link', name: 'Cart' } },
    guard: { cartCount: { gt: 0 } },
    effect: { navigatesTo: 'cart' },
  })
  .skill('purchase', {
    description: 'Buy the items currently in the cart',
    steps: ['add-to-cart', 'go-to-cart'],
    precondition: { authenticated: { eq: true } },
  })
  .build();

const session = app.createSession({
  node: 'catalog',
  state: { authenticated: true, cartCount: 0 },
});

// The LLM's action space: only guard-passing edges, with evidence.
const { version, edges } = session.available();

// An agent fires an action; the app applies it and reports the real delta.
session.fire('add-to-cart', { source: 'agent', expectedVersion: version, payload: { productId: 'p1' } });
session.updateState({ cart: [{ id: 'p1' }], cartCount: 1 });

// The user pressed the back button — reconcile, first-class.
session.sync('catalog', { stimulus: 'navigation' });

// Explanations, powered by footprintjs.
session.why('cart');        // backward slice: which transitions produced this value
session.explain('go-to-cart'); // per-condition guard evidence
session.toMCPTools();       // one MCP tool descriptor per currently-available edge
```

## The navigation graph — describe your app the way you think about it

`appMap()` is the recommended authoring surface (D18). You write the
container tree you already hold in your head — pages, areas, tabs, modals —
and a tool needs only one sentence to exist. That sentence has two readers:
it labels the action for you, and it IS the tool description the LLM sees.

```ts
import { appMap } from 'hcifootprint';

const map = appMap('shop', {
  pages: {
    catalog: {
      route: '/catalog',
      areas: {
        'filter-rail': { tools: { 'set-color': { does: 'Filter dresses by color' } } },
      },
      tools: {
        'add-to-cart': { does: 'Add the selected dress to the cart', when: { authenticated: { eq: true } } },
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

const session = map.createSession();
```

You do not hand over state or handlers up front. Components register what
they have **when they render**, and only what they choose to:

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

## Serving the agent: skills as fixed tools (Mode B)

The tool array an LLM sees never changes: one tool per skill plus
`whats_here` and `do_action`. What is fireable right now arrives inside each
tool RESULT (`readySteps`), and the model acts by calling the same skill tool
again with `{ step }`:

```ts
import { skillsAsTools } from 'hcifootprint';

const port = skillsAsTools(session);
port.tools();                          // static — identical bytes every turn
port.call('shop.skill.purchase', {});  // → { readySteps, judgment, youAreOn, ... }
port.call('shop.skill.purchase', { step: 'catalog.add-to-cart', input: { productId: 'p1' } });
```

Because the tool set is fixed, the prompt cache stays warm for the whole
conversation, and the library works as a plain MCP server with ANY host — no
dynamic-tool support required. High-effect steps stop at `needs-confirm` and
are never auto-crossed.

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
