<h1 align="center">HACI&nbsp;Footprint</h1>

<p align="center"><b>Human &amp; Agent · Computer Interaction</b></p>

<p align="center">
  <strong>Your agent can reach your app — but it's flying blind.<br/>
  Your app already knows what can be done here, and by whom. Hand the agent that map.</strong>
</p>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/haci-hero-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="docs/assets/haci-hero-light.svg">
    <img alt="HACI Footprint — the classic term HCI becomes HACI as a yellow A (Agent) joins the Human's side; a person and an AI act on the app as a team." src="docs/assets/haci-hero-light.svg" width="100%">
  </picture>
</p>

<p align="center">
  <img src="https://img.shields.io/npm/v/hcifootprint?style=flat&color=e0a400" alt="npm version">
  <img src="https://img.shields.io/badge/tests-2659%20passing-f5b301?style=flat" alt="2659 tests passing">
  <img src="https://img.shields.io/badge/core-zero--dependency-f5b301?style=flat" alt="zero-dependency core">
  <img src="https://img.shields.io/badge/serves-a%20real%20MCP%20server-f5b301?style=flat" alt="serves a real MCP server">
  <a href="https://github.com/footprintjs/hcifootprint/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT"></a>
</p>

<p align="center">
  <strong>🌐 <a href="https://footprintjs.github.io/hcifootprint/">footprintjs.github.io/hcifootprint</a></strong> ·
  <a href="https://footprintjs.github.io/hcifootprint/docs/">Docs</a> ·
  <a href="https://footprintjs.github.io/hcifootprint/docs/get-started/quick-start">Quick start</a>
</p>

```bash
npm install hcifootprint
```

> **1.0 — the names are frozen.** You author **actions**, you name **journeys**, and a **tool** is
> what is served to a model. The pre-1.0 spellings (`tools:`, `skills:`) are gone, not deprecated —
> see the [migration](CHANGELOG.md#100---2026-08-02).
> **Agents:** [`llms.txt`](llms.txt) is the whole API surface on one page.

---

## The problem

An agent can already reach your app. The question is how it *operates* one.

| How agents drive a UI today | The cost |
|---|---|
| Screenshot the page, reason over pixels | slow, fragile, redone every turn |
| Dump the DOM into the prompt | every wrapper and class, re-sent each turn — and it still guesses what does what |
| Hard-coded selectors, RPA scripts | break on the next redesign |

All three relearn your app from scratch on every visit.

**Measured, on a real page**: a five-page demo's rendered DOM is 2,027 tokens; what this library
sends for the same page is 332 — **6.1× less per turn**, at 41.5 tokens per available action. That is
one page of one small app whose DOM is dominated by its shell, so treat it as a floor rather than a
headline; the script is in the repo (`node bench/token-cost/token-cost.mjs`) and the honest way to
know your own number is to run it against your own app. A returning human doesn't — they carry a
mental model of where things are and what they're allowed to do. **Your app holds that same map. This
hands it to the agent.**

And it is safe to adopt for one reason: **you are not opening your backend — you are letting an agent
drive the frontend a human already can.** It acts as the signed-in user, through your own buttons and
handlers, inside exactly the permissions they already have. No new endpoints, no new grants.

---

## The model

**Three contexts.** An agent driving your app asks three questions, and this library answers exactly
those — each in the same three parts: what you **declare**, what you **wire**, and what the **agent
gets**.

### 1 · The map — *what can this app do?*

**Declare** the app as the tree you already picture: places, the things inside them, the named flows
worth finishing. One sentence per action — that sentence is your label *and* the tool description the
model reads.

```ts
pages: {
  catalog:  { route: '/catalog',  actions: { 'add-to-cart': { does: 'Add the open dress to the cart', writes: ['cart.items'] } } },
  checkout: { route: '/checkout', actions: { 'place-order': { does: 'Place the order', enabledWhen: { 'cart.items': { gt: 0 } }, confirm: true } } },
},
journeys: { purchase: { does: 'Buy a dress end to end', steps: ['add-to-cart', 'place-order'] } },
```

Already have a route table, a router's own nested route tree, a journey list, a live action store?
`fromRoutes`, `fromReactRouter`, `fromJourneys` and `fromLiveStore` adopt them under one documented
merge order — nobody re-types anything. `fromReactRouter` transcribes a page name from a fully-static
address (`/projects/new` → `projects-new`) and refuses, naming both doors, wherever there is nothing
to transcribe — a `:param`, a `*`, the root. It never guesses a name.

**Wire: nothing.** A map is static data. It validates and freezes in one call, so it can be linted in
CI and argued about in a pull request before your app runs at all.

**The agent gets** one tool per journey, plus four fixed generics. **The tool list *is* the map**, and
its bytes never change for the life of a conversation. A whole-page dump is never served — that is the
thesis, not an optimisation.

### 2 · Traversal — *where am I, and how do I get there?*

**Declare** two fields, on the map you already wrote: `route` on a page, `goTo` on an action. An
action's claim **is** the edge; pages declare no edges to one another.

```ts
cart: { route: '/cart', actions: { pay: { does: 'Check out', goTo: 'checkout' } } },
```

**Wire** the session, and one line wherever your router already knows the page changed.

```ts
const session = graph.createSession({ node: 'catalog' });
session.sync('checkout');            // the router moved → the cursor moves
```

**The agent gets** where it is, whether arrival is `claimed` or `observed` — never a guessed third
value meaning *did not arrive* — and the declared hops to any destination.

### 3 · Actions — *what is possible here?*

**Declare** what an action is, once, where it lives: `does`, `writes`, `enabledWhen`, `goTo`,
`confirm`, `verify`, `input`, `humanDecides`.

**Wire** your own functions, by reference, when the component that renders them mounts.

```ts
const group = session.registerActions('checkout', {
  handlers: { 'place-order': (input) => shop.placeOrder(input) },
});
group.setEnabled('place-order', false);                // the greyed button
group.setBusy('place-order', 'Placing your order…');   // your words, never ours
session.updateState({ 'cart.items': 3 });              // your store → conditions re-evaluate
```

**The agent gets** one row per action that is offered here, carrying `enabled`, `blockedBecause`,
`busy`, `holds`, `goesTo`, `expects`, `highEffect`, `humanDecides` and `unblockedBy`. Every stamp is
presence-only: a key means your app said so, and no key means the library does not know.

### Declared or wired? One question decides

> **Can this fact change while the page is open?** If **no**, it is a declaration
> (`enabledWhen`). If **yes**, it is a wire (`setBusy`).

That is why there is no `busyWhen`: a condition can prove a state, but it cannot author a label, and a
library-written label would be a library-written meaning.

### And a fourth thing — which you never build

The relations *between* actions are the part people expect to have to author. You don't.

*Is `place-order` blocked, and by what?* `add-to-cart` writes `cart.items`; `place-order` waits on it.
Nobody wrote an edge, and the edge is unambiguously there — so it is **derived, never authored**, and
cannot drift from your graph:

```ts
session.whatUnblocks('checkout.place-order');
// [{ affordanceId: 'catalog.add-to-cart', viaKeys: ['cart.items'] }]
```

*How do I get to checkout?* A route is walked from the `goTo` claims you already made:

```ts
session.howToReach('checkout');   // [{ action: 'catalog.open', to: 'product' }, …]
```

**Everything relational is derived from declarations you make for other reasons.** There is no edge
API in this library — not between pages, not between actions. The only thing you declare that cannot
be derived is *intent*: "these steps, in this order, toward this goal" — a
[journey](https://footprintjs.github.io/hcifootprint/docs/map/journeys), because a preferred order is
meaning, and meaning is yours.

→ [The three contexts](https://footprintjs.github.io/hcifootprint/docs/get-started/three-contexts) ·
[What would free it](https://footprintjs.github.io/hcifootprint/docs/actions/what-would-free-it) ·
[How to reach a page](https://footprintjs.github.io/hcifootprint/docs/traversal/how-to-reach) ·
[Navigation graph](https://footprintjs.github.io/hcifootprint/docs/map/navigation-graph)

---

## Why this makes an agent better

Not by making the model smarter. By never making it guess.

Every turn, the agent gets **only what is true here, now** — one page's actions, not your whole app:

```
You are on: Checkout   (step 3 of 4)

Actions here:
  edit-address   Change the delivery address
  place-order    Place the order          [not available]
                 waiting on: cart.items
                 which "Add to cart" writes — and it is running right now
                 needs a person's approval before an agent may fire it

Last outcome: address update — performed, verified
```

Follow what that removes. The model doesn't infer the page — it's told. It doesn't guess whether a
control is clickable — it's told, and told *why not*, and *what would change it*. It doesn't wonder
whether its last action worked — the outcome is a fact, not an assumption. It doesn't hunt for the
finish line — a journey names the steps and the library says which are still open.

**A greyed button is the whole argument.** A production integration's agent met one, was told only
that it was disabled, fired it again to find out what would change, then told its human the app was
broken. Nothing had failed — an upload was still running. That agent wasn't bad at its job; it was
answering a question nobody had given it the facts for.

Three consequences, in order of how much they matter:

- **It stops hallucinating capability.** Anything derived rather than observed is flagged
  (`arrival: 'claimed'`, `guardUnevaluated`, `presence: 'unknown'`). Every refusal is typed and
  teaches — so the agent replans instead of inventing a cause.
- **A smaller model goes further.** The reasoning that used to reconstruct your app from a DOM dump is
  simply not spent. This is context engineering, not model choice.
- **Tokens are bounded by the page, not the app.** What's on screen is what's sent.

→ [Reading an action row](https://footprintjs.github.io/hcifootprint/docs/actions/reading-an-action-row) ·
[Grounding](https://footprintjs.github.io/hcifootprint/docs/actions/grounding) ·
[Modes](https://footprintjs.github.io/hcifootprint/docs/map/modes)

---

## Quick start

Three steps. The first two run offline, with no API key.

**1 · Describe the app** — the tree you already picture.

```ts
import { buildNavigationGraph } from 'hcifootprint';

const graph = buildNavigationGraph('shop', {
  pages: {
    catalog: { actions: { 'add-to-cart': { does: 'Add the open dress to the cart' } } },
    checkout: { actions: { 'place-order': { does: 'Place the order', confirm: true } } },
  },
});
```

**2 · Connect it** — components register what they have when they render; your router reports the page.

```ts
const session = graph.createSession();

const group = session.registerActions('catalog', {
  handlers: { 'add-to-cart': (input) => shop.add(input.id) },   // your own function, by reference
});

session.sync('checkout');                       // router change → the cursor moves
session.updateState({ cartCount: 1 });          // your store → guards re-evaluate
```

**3 · Serve it** as a fixed set of MCP-shaped tools. The tool list never changes; what's doable *right
now* arrives inside each result.

```ts
import { mcpServer } from 'hcifootprint/mcp';
mcpServer(session);
```

→ [Quick start](https://footprintjs.github.io/hcifootprint/docs/get-started/quick-start) ·
[Adoption ladder](https://footprintjs.github.io/hcifootprint/docs/get-started/adoption-ladder) —
start in guide mode, where the agent can only *describe* what's possible.

---

## Honest by construction

Two properties do most of the safety work, and they are why this is worth adopting over a DOM dump.

**It says what it can't see.** Derived facts are marked as derived. Unknowable ones are `unknown`,
never guessed. A failed read says *"the app could not re-read its actions here"* instead of serving an
empty list as truth. Silence is never a verdict, and a clock is never evidence.

**A human's yes is a reference, not a claim.** For a high-effect action, an agent asserting *"the user
approved"* proves nothing. The library requires a pointer to a decision a person actually recorded,
bound to the receipts they were shown.

**And some choices are not the agent's to make at all.** `humanDecides` says a decision belongs to a
person — the agent presents the options and stops, and the human answers through your own control.
It is disclosed on every surface and enforced on none: the flow is simply in someone's hands, and
the library can say so without inventing a gate you never declared.

```ts
'choose-shipping-speed': {
  does: 'Choose a shipping speed',
  writes: ['checkout.shipping'],
  humanDecides: {
    about: 'which shipping speed',                   // your words, carried as data
    doneWhen: { 'checkout.shipping': { ne: '' } },   // your own "it has been decided"
  },
}
```

→ [Human-in-the-loop](https://footprintjs.github.io/hcifootprint/docs/actions/receipts) ·
[Whose decision it is](https://footprintjs.github.io/hcifootprint/docs/actions/whose-decision-it-is) ·
[Paused is not failed](https://footprintjs.github.io/hcifootprint/docs/actions/paused-not-failed) ·
[The human sensor](https://footprintjs.github.io/hcifootprint/docs/actions/human-sensor)

---

## More

| | |
|---|---|
| **Async & progress** — the promise is the completion signal; `busy` in the app's own words | [Going async](https://footprintjs.github.io/hcifootprint/docs/actions/going-async) · [Waiting for the app](https://footprintjs.github.io/hcifootprint/docs/actions/waiting-for-the-app) |
| **Keep the graph true** — a drift harness that fails in CI, not in front of a user, and a conformance check no source adapter can silently drop a declared field past | [Testing](https://footprintjs.github.io/hcifootprint/docs/reference/testing) |
| **Adopt what you have** — routes, journeys or a live store as graph sources | [Graph sources](https://footprintjs.github.io/hcifootprint/docs/map/graph-sources) |
| **React** — one hook per control, and a five-line port for any other framework | [React binding](https://footprintjs.github.io/hcifootprint/docs/actions/react-binding) |
| **Tree-shakeable, ESM-first** — the sensor is 11.9 KB; the React hook 610 B | [Tree-shaking](https://footprintjs.github.io/hcifootprint/docs/reference/tree-shaking) |
| **The gap ledger** — what the agent *couldn't* do, recorded, never hidden | [Grounding](https://footprintjs.github.io/hcifootprint/docs/actions/grounding) |

---

## Development

```bash
npm install && npm test        # the suite, with the badge gate
npm run build                  # dist/, ESM-first
npm run docs:truth             # does the documentation describe what ships?
```

## Built on

[footprintjs](https://github.com/footprintjs/footPrint) for the graph engine and commit log ·
[agentfootprint](https://github.com/footprintjs/agentfootprint) if you want the agent loop too.

## Citing

See [`CITATION.cff`](CITATION.cff), or use GitHub's **Cite this repository**.

## License

MIT — see [LICENSE](LICENSE).
