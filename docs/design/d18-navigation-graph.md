# D18 — The Navigation Graph (v2 core API)

**Status: DRAFT — uncommitted, awaiting Sanjay's teardown.**
Adjudicated 2026-07-03 by a five-lens design panel (tree-semantics, authoring-api,
registration-sensor, adoption-ladder DX, serving-modes) plus an adversarial
contradiction pass. Every load-bearing claim below was grounded against real
framework behavior (React 18 effect semantics, MUI/Radix keep-mounted panels,
Anthropic prompt-cache rules) or probed against hcifootprint's own dist.

---

## 1. The problem this solves

v1 asks the consumer to hand us three things up front: their **state** (a
projection), their **handlers** (the `pageTools()` map), and a **flat page
list**. Sanjay's critique, verbatim intent:

> "We are asking consumers to expose their state and internals. Navigation
> could be pages, tabs, containers — a semantic way, the consumer decides.
> Each container/leaf has its own tools. Register at render time with just a
> description. We don't need their state or methods beforehand."

v2 keeps the atom and the driver untouched and changes **what the author
writes** and **when the runtime learns things**:

- The consumer authors a **Navigation Graph** — the semantic container tree
  they already have in their head (pages → areas/tabs/modals → tools).
- The agent consumes a derived **Skill Graph** — same data, different
  projection. Neither party sees the other's vocabulary.
- State, handlers, guards are **rungs on a ladder**, not an entry fee.

## 2. One tree, two readers (the dual identity)

```
consumer authors            agent consumes
NAVIGATION GRAPH   ──────►  SKILL GRAPH
pages/tabs/modals           skills, steps, fireable edges
`does:` intent strings      tool descriptions (same strings)
mount at render             presence + materialization
```

The `does:` field is **one authored string with two readers**: to the
consumer it labels what the button does; to the agent it IS the tool
description. Because it is written by the developer in source code, the
planner-facing channel stays firewall-clean by construction. Runtime text
(state values, instance keys, user input) never enters it.

## 3. Authoring surface

### 3.1 `appMap()` — a single object literal

```ts
const map = appMap('dress-shop', {
  pages: {
    catalog: {
      route: '/catalog',
      areas: {
        'filter-rail': {
          tools: {
            'set-color': { does: 'Filter dresses by color', input: colorSchema },
          },
        },
      },
      tools: {
        'add-to-cart': {
          does: 'Add the selected dress to the cart',
          when: { authenticated: true },          // guard (v1 operator table)
          writes: ['cart'],                       // effect
        },
      },
    },
    checkout: {
      route: '/checkout',
      modals: {
        'confirm-order': {                        // overlay: masks siblings while shown
          tools: {
            'place-order': { does: 'Place the order', confirm: true, writes: ['orders'] },
          },
        },
      },
      tabs: {                                     // at most one child shown
        shipping: { /* … */ },
        payment:  { /* … */ },
      },
    },
    orders: {
      areas: {
        'order-card': {
          repeats: true,                          // template + instance keys
          tools: { 'cancel-order': { does: 'Cancel this order', confirm: true } },
        },
      },
    },
  },
  tools:  { /* root-level multi-attach: { on: ['catalog','orders'], … } */ },
  skills: { /* v1 skill declarations, steps referenced by qualified path */ },
});
```

Design rules (authoring-api lens, amended by tree-semantics restraint):

- **No `.build()`** — `appMap()` validates, freezes, and returns the compiled
  map in one call. Same enforcement spine as v1 (typo detection, denied keys,
  empty-guard rejection), now over the whole tree.
- **Exactly three authored semantics.** Everything else is descriptive sugar:
  1. `modals` — overlay masking. While a modal is shown, sibling tools are
     suppressed with the typed rejection `BLOCKED_BY_OVERLAY`. `blocks: false`
     opts a popover out. Modal close auto-resumes the parent — no `history`
     states, ever.
  2. `tabs` — an exclusivity **prior**: "at most one child shown". It is NOT
     a statechart: no transitions, no `initial`, no history. It exists because
     exclusivity is design-time knowledge that provably cannot be recovered
     from mount observation (keep-mounted tab panels — see §4.3).
  3. `repeats: true` — template node + runtime instance keys (§4.6).
- **`areas`** = things that coexist (AND). Mounted ⇒ active. This is where
  the pure "activity from registration" story survives intact.
- **Node paths are the identity.** Qualified tool id = dot path
  (`checkout.confirm-order.place-order`); instances use brackets
  (`orders.order-card[o-123]`). Skills may reference steps by unambiguous
  suffix — resolved (or failed loudly) at `appMap()` time. Const-generic
  typing makes node-path typos in skills and `mount()` calls compile errors —
  the strongest guardrail available to a tests+types-only author.
- **Container guards compose.** Any node may carry `when:`; a tool's
  effective guard = AND of every ancestor guard root→leaf ∧ its own. Children
  can only narrow, never weaken.
- **Tool declaration is a gradient, not a cliff.** A spine tool needs only
  `{ does }`. Binding, guard, effect, schema may all materialize later at
  mount. Tools no skill references can skip declaration entirely and appear
  at registration (§5). This makes the L0 floor literally pages + routes.
- **v1 `skillGraph()` is kept forever** as sugar compiling to a one-level
  tree. The dress-shop demo runs byte-identical with zero changes.

## 4. Runtime model — observed presence, authored priors, evidence-based focus

The panel's unanimous first finding: **the candidate "activity comes from
registration" model, as written, is wrong.** Registration observes MOUNTED,
not VISIBLE. Real frameworks keep invisible things mounted (MUI `keepMounted`
tabs, Radix `forceMount`, Vue `keep-alive`, modals held mounted for close
animations) — pure emergence would offer tools on invisible surfaces and, for
an exclusive modal, suppress the parent's tools forever. The fix is a **fused
sensor stack** with an explicit priority order:

| level | owner | signal |
|---|---|---|
| page | **router sync** — always wins | `session.sync(path)` |
| meaning | **authored semantics** | `modals` / `tabs` / `repeats` |
| presence below the page | **mount registrations** | refcounted open handles |
| visibility | **explicit wire** (day one, not roadmap) | `visible:` option, `session.setVisible/show()` |

### 4.1 Presence set and focus path — two observed facts

- **Presence** = upward closure of every node with a live mount handle,
  strictly *below the router-confirmed node*, plus the synced node itself.
- **Focus ("You are on")** is set ONLY by `sync()` and `fire()` evidence —
  never by registration, never by recency (React commits effects bottom-up;
  a lazy sidebar finishing its mount must not steal focus from a modal).
  When the focus node deactivates, focus falls back to the nearest still-
  present ancestor — modal-close auto-resume for free.
- The contextBrief renders the focus path PLUS the active frontier:
  `checkout — shipping tab shown; confirm-order modal closed`.

### 4.2 Dormancy — the router owns the page level

A registration outside the router-current subtree (exit animations,
register-before-sync races) goes **DORMANT**: held, not offered, never
focus-moving, instantly activated if the router then confirms that page.
A foreign registration persisting past a grace window emits a gap-ledger
drift row + dev warning. This kills the register-before-sync race and exit-
animation ghosts in one rule.

### 4.3 Hidden-but-mounted — a signal, not a guess

When a `tabs` group has more than one mounted child and no visibility wire:
**serve the flagged union** — every child's edges served with
`presence: 'unknown'` — and emit one dev warning naming the one-line upgrade
(`visible:` at mount, or `session.show(path)`). We never pick a "most recent"
winner; a wrong guess served as fact is worse than honest uncertainty.
The wire itself (`setVisible`/`show()`/`visible:`) **ships in the same
release as the tree** — an animation-held modal (`open={false}`, still
mounted) would otherwise mask its parent forever, and no amount of
registration can see CSS.

### 4.4 Assumed-active at the bottom rungs

At L0 nothing registers, so presence-only would make the tree useless exactly
where adoption starts. Resolution (kind-scoped defaults):

- The routed page's declared subtree defaults to **assumed-active**, stamped
  `activation: 'assumed'` + `materialized: false`.
- `areas` and leaves assume; **`modals` never assume** (closed until
  registered/shown); multi-child `tabs` assume the flagged union.
- `fire()` on an unmaterialized edge returns the retriable typed rejection
  `STILL_MOUNTING` — never a misleading `GUARD_FAILED`.
- Every served edge stamps its evidence level: `assumed` → `registered` →
  `shown`/`hidden`. Honesty markers over guessing, everywhere.

### 4.5 Structure is world-motion — but scoped (the version split)

v1 has a real, probe-verified gap: `registerTools` never bumps `#version`,
so a plan made before a modal closed passes CAS afterward. v2 fixes it
without letting scroll churn poison plans, by **splitting the version**:

- `stateVersion` — bumped by `updateState` (v1 semantics).
- `structureVersion` — bumped by node-level presence/visibility flips; each
  flip records ONE microtask-coalesced **structure-swap stimulus transition**
  with an empty commit (footprint's deliberate-cursor-stop idiom). StrictMode
  and HMR mount/unmount flicker coalesces to nothing — transient dev noise
  never becomes world-motion in the trace.
- **Instance-level churn inside `repeats` containers bumps NOTHING global** —
  it only toggles per-edge `materialized`. A vanished modal always staleness-
  fails an in-flight plan; a scrolling virtualized list never does.

(Naming per the plain-names rule is an open question — see §10.)

### 4.6 Repeated containers — one tool, N instances

- ONE parameterized tool per template affordance, never N tools. The schema
  declares `instanceKey` as a plain required string with a static authored
  description — **live keys never become schema enum values** (unbounded,
  cache-busting, injection-adjacent).
- Live keys travel as **capped, sanitized data** on the served edge / brief
  (`instances: string[]` + total count), sharing one sanitizer with sync's
  node ids.
- **Existence vs materialization split:** when an L2 state selector (or a
  declared `instances:` source) exists, it owns existence — order #57 exists
  while scrolled out of view; mounted instances merely mark
  `materialized`/fireable-now. At L0/L1 with no selector, serve the mounted
  window WITH `enumeration: 'mounted-window'` so partial knowledge is stated,
  not silently presented as complete.

## 5. Registration — mount handles

```ts
// in the component that renders the coupon box:
const handle = session.mount('cart.coupon-box', {
  handlers: { 'apply-coupon': (code) => shop.applyCoupon(code) },  // bind declared tools
  tools: {                                                          // or declare new leaves here
    'clear-coupon': { does: 'Remove the applied coupon', handler: () => shop.clearCoupon() },
  },
  instance: undefined,      // set for repeats templates: 'o-123'
  visible: () => el.offsetParent !== null,   // optional visibility wire
});
// on unmount:
handle.release();
```

- **Node-anchored, handle-based.** Presence = count of open handles per node
  (StrictMode-correct: setup→cleanup→setup nets to one). `release()` is
  idempotent per handle. Handle identity replaces string groups as the
  primary identity; `registerTools({group,…})` stays as the v1-compat shim
  compiling onto one handle.
- **Two distinct keys, one firewall rule:** `handlers` binds by reference to
  declared tools; `tools` declares new leaves whose `does` string is a
  registration-site **source-code literal** — developer-authored, so the
  firewall holds. Declared-wins precedence; `descriptionSource` marker makes
  the origin auditable. Last-wins-with-warn only when two different handles
  bind the same declared tool.
- **Registry is two-phase:** raw edits apply immediately to the working set;
  activity transitions (rows, version bumps, brief lines) coalesce per
  microtask.
- **The React adapter is the enforcement point** for the sensor contract:
  register only in effects (never render — concurrent-render discards),
  stable keys from node path (not component identity), cleanup returned from
  the effect. Registration actually tracks interactability BETTER than DOM
  presence under Suspense (React drops effects of re-suspended subtrees).

## 6. The adoption ladder — two dials, four rungs

SENSE (router → DOM sensor → state tap) × ACT (none → DOM actuation →
handlers), marketed as four curated rungs. Dress-shop measured costs:

| rung | wire cost | what the agent can do |
|---|---|---|
| **L0a** router sync only | ~100 lines of graph + 2-4 lines connect | explain the app, give tours, plan |
| **L0b** + DOM actuation adapter | +1-3 lines | ACT through the page (bindings already exist in the atom) |
| **L1** + handlers at mount | +~40 lines | act through the app's own functions |
| **L2** + state tap | +~25 lines | guards evaluated, effects verified, full "why" |

Two **verified v1 rung-killers** get fixed as part of D18 (they currently
force L0/L1 users to maintain a second stripped graph, breaking author-once):

1. **Guards over never-reported state keys silently hide tools.** Fix: serve
   the edge WITH `guardUnevaluated`; skills report
   `preconditionUnevaluable` instead of lying `pre: false`. (`confirm: true`
   + unevaluable keeps the confirmation gate.)
2. **A declared-writes fire with no state tap stays pending forever** —
   frames never complete, the brief carries a permanent "Pending" line. Fix:
   rung-aware settlement — settle on handler completion (L1) or actuation
   completion (L0b) with `effectVerified: 'unobservable'`, default inferred
   from whether a state tap was provided.

L0b ships as a separate DOM adapter (subpath or sibling package) built
entirely on existing seams: `fire(id, {invoke:false})` + actuate +
`reject(transitionId)` on actuation failure. Zero core changes; disabled/
hidden targets become honest structured failures + drift telemetry.

### 6.1 The `event.target.value` rule + option discovery (user-directed 2026-07-03)

Many real handlers read their input from the event, not from arguments
(`onChange={(e) => setColor(e.target.value)}`). **The consumer decides the
actuation mechanism at registration** — three options, best first:

1. **Point us at a function** (L1): declare the value in the tool's input
   (`input: { color: 'the color to filter by' }`) and hand over a handler
   (`handler: (input) => setColor(input.color)`). The agent sends the value
   as tool input; the app's own `setState` runs; no DOM tricks anywhere.
2. **Give a binding only** (L0b): we mimic the REAL user interaction on
   screen (rules below).
3. **Neither** (L0a): the tool is plannable/tour-able but record-only.

The `event.target.value` machinery below applies ONLY to option 2 — never
forced on a consumer who provided a handler. Two consequences for that rung:

- **L0b actuation mimics the real interaction, never calls handlers with
  synthetic arguments.** For value-bearing elements the adapter sets the
  value through the element's NATIVE setter and dispatches real
  `input`/`change` events — so a handler reading `event.target.value` fires
  exactly as it would for a human (the testing-library mechanism; controlled
  React inputs require the native-setter hack, already noted as GROUNDED).
  A click binding is a real click at the bound element. The app's code path
  is byte-identical for user and agent — that's the whole point of the rung.
- **Option discovery: the agent must be able to SEE what is selectable.**
  A dropdown's option set is runtime data (it lives in the DOM or state, not
  in the declared graph), so it rides the **data channel** — served on the
  edge / in `readySteps` results as capped, sanitized `options: string[]`
  (same sanitizer as instance keys and node ids), **never as schema enums**
  (cache-busting + injection-adjacent). Source by rung: at L0b the adapter
  enumerates the rendered options through the binding; at L2 a declared
  `options:` state selector owns it (and works even when the dropdown isn't
  rendered). No source available → `options: 'unknown'` honesty marker, and
  the agent falls back to `whats_here`. No new tool is needed: in Mode B the
  option list arrives in the skill-tool/`whats_here` RESULT, cache-stable.

The three-commit demo story IS the ladder: commit 1 = L0a, commit 2 = L1,
commit 3 = the chatbot.

## 7. Serving modes (lens 5 — **Mode B user-endorsed 2026-07-03**)

Prompt-cache ground rules [GROUNDED]: tools render first in the prompt; any
tool-set change busts every cache tier; minimum cacheable prefix on Opus 4.8
is 4096 tokens.

- **Mode A — dynamic tools.** Precise, but every navigation re-writes the
  tool array = full cache bust per hop. Kept for tiny apps/short sessions.
- **Mode B — skills-as-fixed-tools (DEFAULT).** The tool array contains ONE
  tool per skill (+ two fixed generics `whats_here`, `do_action`) and NEVER
  changes. Each skill tool has the STATIC input schema
  `{step, input, confirm}` (an enum-of-ready-steps would re-bust the cache).
  Disclosure rides the **result channel**: every skill-tool response returns
  `readySteps` — what is fireable at the current navigation cursor, right
  now — and the model decides the next call from data, not from schema.
  Judgment states: `needs-choice` / `needs-input` / `needs-confirm`;
  auto-advance never crosses a high-effect edge.
  **The paper sentence:** JIT disclosure moved from the tool channel
  (cache-busting) to the result channel (cache-stable).
- **Mode C — two-tool router** (`use_skill` + `do_step`) for many-flow apps —
  the frontend analog of agentfootprint's `entryByRead` router.
- **One conversation = one mode** (a mid-conversation mode flip is a tool-set
  change = full bust). The Session is mode-agnostic; modes are serve-layer.

**The cross-skill question** (Sanjay, 2026-07-03: *"what if the user asks
about a totally new page relative to the skill currently loaded?"*): in Mode
B every skill is always in the tool array, so the model simply calls the
other skill's tool — the session performs an implicit `leaveSkill` +
`commitSkill` on the flow switch (frames are disclosure, guards are the
gate). For loose asks that match no skill, `whats_here` answers from the
declared spine at the current cursor, and `do_action` fires spine tools
directly. Nothing about a new page requires touching the tool array.

**Pre-registered honesty caveat for H9/X2:** Mode B's token win materializes
in LONG conversations; short sessions ≈ parity (4096-token minimum prefix).
X2b must ablate serving mode explicitly.

## 8. Honesty markers (complete v2 vocabulary)

| marker | meaning |
|---|---|
| `activation: 'assumed'` | declared subtree of routed page, nothing registered |
| `presence: 'unknown'` | mounted tabs union, no visibility wire |
| `visibility: 'assumed'` | node shown-status derived, not signaled |
| `materialized: false` | spine tool declared, handler not yet mounted |
| `enumeration: 'mounted-window'` | instance list = what's mounted, not what exists |
| `guardUnevaluated` | guard keys absent from the session's state view |
| `effectVerified: 'unobservable'` | settled without a state tap |
| `settling` | router node changed more recently than registrations under it (deep-link/SSR window) |
| typed rejections | `BLOCKED_BY_OVERLAY`, `NODE_NOT_VISIBLE`, `STILL_MOUNTING`, `NOT_ON_NODE` — all recorded to the gap ledger, never silent |

## 9. Rejected alternatives (and why)

- **Pure activity-from-registration** — registration sees mounted, not
  visible; fails keep-mounted tabs and animation-held modals (§4).
- **Statecharts for tabs** (transitions/initial/history) — exclusivity prior
  is the whole need; the rest re-imports SCXML complexity the atom rejected.
- **Picking a "most recently mounted" tab winner** — a guess served as fact;
  the flagged union is honest and one line away from precise.
- **Registration/recency moves focus** — React's bottom-up effect order makes
  recency meaningless; background mounts would steal "You are on".
- **Instance keys as schema enums** — unbounded, cache-busting,
  injection-adjacent; keys are data, not schema.
- **N tools for N instances** — tool-array churn and cache busts; one
  parameterized tool.
- **Foreign registrations served immediately** — exit-animation ghosts and
  register-before-sync races; dormancy + drift telemetry instead.
- **One global version for everything** — virtualized-list scroll would
  permanently staleness-fail plans; split the version, scope instance churn
  to per-edge flags.
- **Group strings as primary registration identity** — StrictMode double-
  mount breaks string refcounts; handles are identity, groups stay as shim.
- **A `.build()` step / fluent-only v2 surface** — the object literal is the
  shape router authors already write, the codegen target, and the typed-path
  anchor; v1 fluent stays as sugar.

## 10. Open questions for Sanjay (decisions, not homework)

1. **Names** (plain-names rule): `appMap` vs `navGraph`; `stateVersion` /
   `structureVersion`; `mount`/`release`; `show`/`setVisible`; the SENSE-dial
   option (`observes:`? `stateTap:`?). Panel proposals above are placeholders.
2. **`guardUnevaluated` fire semantics** — freely fireable (the app is the
   enforcer at L0/L1, recommended) or require `confirm` on every unevaluable
   high-effect edge?
3. **`session.show(path)` in v2 core** or only in the browser adapter?
4. **Does `activation:'assumed'` leak into MCP descriptors** (token cost,
   planner confusion) or stay in `available()`/brief only?
5. **CAS shape** — does `fire({expectedVersion})` check both versions, or
   grow `expectedStructureVersion` separately?
6. **Nested routed pages** (product route under catalog route) — v2.0 keeps
   `pages` flat at root; is route-under-route a v2.1 concern?

## 11. The blindspot the panel itself missed (→ D20 candidate)

**The observability boundary.** Every proposed signal — router sync, mounts,
visibility wires, DOM sensor, state tap — terminates at the app's own window
and component tree. Not one lens addressed journeys that LEAVE it:
cross-origin payment iframes (a Stripe element inside checkout — in a dress
shop whose hero skill is *buying the dress*), OAuth popups, `target=_blank`,
full-page redirects/reloads. Open design questions: a declared `boundary`
node kind (authored expectation: "control leaves here, returns at X");
journey continuity across a full reload (session resurrection from router
sync + storage); how the brief narrates "the user is somewhere we cannot
see" honestly. This is the next adjudication, not a D18 blocker — but the
dress-shop demo should not pretend checkout has no payment step forever.

## 12. Compatibility & migration

- v1 flat pages ≡ a one-level tree; `skillGraph()` compiles onto the same
  spec type. Dress-shop demo: zero changes, byte-identical behavior.
- `registerTools` keeps working as a shim over one mount handle.
- The two rung-killer fixes (§6) and the `registerTools`-version gap (§4.5)
  are behavior changes v1 consumers WANT — each lands with its own tests and
  a changelog line.

## 13. Build order (proposal — gated on explicit yes, per working rule)

1. Version split + structure-swap transitions (fixes the verified v1 CAS gap;
   smallest blast radius, pure session-layer).
2. Tree compile target + `appMap()` + path typing (`skillGraph()` re-based as
   sugar; all 110 v1 tests must stay green untouched).
3. Mount handles + fused presence/focus + dormancy + visibility wire.
4. Assumed-active levels + the two rung-killer fixes + honesty markers.
5. Repeats/instances.
6. Mode B serve layer (`skillsAsTools(session)`) + generics; demo assistant
   flips to Mode B.
7. React adapter (`useMount`) + L0b DOM actuation adapter (separate package).

Each phase = tiny layer, own tests, own README section, panel spot-review —
Convention 3 applies (7 test types per feature).
