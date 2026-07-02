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

## Honesty rules (load-bearing)

- **Provenance is accountability for cooperating agents, not a security boundary.** An agent driving the browser like a human is indistinguishable from one at the DOM. Route agents through `fire(edgeId, { source: 'agent' })`; enforce high-effect actions server-side.
- **Two string classes.** Authored descriptions are the only text served to a planner. Runtime strings (DOM labels, user content) are data — attacker-controlled page text cannot inject instructions into the action space. Tested.
- **Guards re-evaluate at fire time; `expectedVersion` rejects stale plans.** Plan-time availability is advisory.
- **MCP descriptors carry no version token.** A pure-MCP consumer cannot join the concurrency protocol — the MCP host should call `available()` itself and pass `expectedVersion` when firing. Guard evidence (`actualSummary`) and validation `issues` are runtime-data channels: treat them as data, never instructions.

## Roadmap

- Browser adapter: MutationObserver binding resolver, router/store taps, Web Worker graph host with a measured main-thread budget.
- Route-tree derivation (Next.js / React Router) so the page skeleton is generated, not authored.
- CI `verifyBindings()` — walk every authored edge headlessly and fail the build when a binding no longer resolves.
- Parameterized affordance instances (`instanceKey`) for lists and collections.
- Task frames: suspend/abort/resume semantics for skills interrupted mid-flow.
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
