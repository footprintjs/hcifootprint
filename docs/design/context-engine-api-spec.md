# The Context Engine — staged API spec

Companion to `context-engine-api.md` (the decisions). This is the **shapes**, in the order they build
on each other: Navigation → Actions → Action edges → how they connect.

Every **Today** block is real and runs on 0.11.0. Every **Proposed** block is not built.

---

# The model, restated

Two structures, and one rule about which is which.

**Places are a LIST, not a graph.** Pages plus containment (areas, tabs, modals) — a tree of
*where you can be*, with no edges between pages.

*Why no page edges:* what would one be? It is always caused by something — a link, a button, a
redirect — and all of those are **actions**. An action that declares `navigatesTo` **is** the edge.
Declaring page edges separately would be a second source of truth for something already declared on
the action. Reachability is therefore **computed** by walking actions that navigate: "how do I get to
checkout?" is answered without a page graph, and nothing is lost. (Our own `crossLinks` already fit:
they are link elements with url bindings — actions.)

**Actions carry the only real graph, and all of it is derived.**

| Relation | Means | Derived from |
|---|---|---|
| **enables** | A must happen before B can | `A.writes` × `B.enabledWhen` |
| **awaits** | B cannot proceed while A is in flight | live `busy` / pending settlement |
| **authorizes** | a human's yes unlocks B | `highEffect` + the ask book |

Every one reads facts the app **already** declares or the runtime **already** knows. So there is no
edge API to write — not between pages, not between actions.

**The one thing that must be declared, because it cannot be derived: intent.** "These steps, in this
order, toward this goal" is a **journey**. No dependency analysis produces it, because a preferred
order is meaning, and meaning is the app's.

**So the whole model is:**

```
DECLARED by the app          DERIVED by the library
─────────────────────        ──────────────────────
places (a list)              reachability      ← navigatesTo
  + containment              enables           ← writes × enabledWhen
actions (per place)          awaits            ← busy / pending
journeys (intent)            authorizes        ← highEffect + asks
```

---

# Working backward: what 0.11.0 already is, measured against the model

The useful surprise: **the model is not a redesign.** The declarations already fit it, and the core
derivation already exists in the codebase. What is missing is *scope and exposure*, not architecture.

## The declarations — already right

| Model says | 0.11.0 has | Verdict |
|---|---|---|
| places are a **list** + containment | `nodes: {…}` with `areas` / `tabs` / `modals`; **`NodeDef` has no edges field at all** | **fits** — page edges were never declarable, so nothing to remove |
| actions belong to a place | `tools: {…}` inside a node | **fits** (but see naming, below) |
| journeys declare intent | `JourneyDef` / skills | **fits**, under two names, and thinner than it should be |
| navigation is an action's claim | `goTo` / `effect.navigatesTo` | **fits** |

Nothing here needs restructuring. The graph was already a list of places whose edges live on actions —
the model *describes* the library rather than changing it.

## The derivations — the rule exists; the reach does not

`src/graph/skill-deps.ts` already implements the enablement rule, and states the law in its own words:

> Step B depends on step A when A's declared `effect.writes` overlap B's guard keys — *"the dependency
> DAG is **DERIVED, never authored**, and cannot drift from the graph."*

```ts
stepDependencies(affordances, steps, stepId): DependencyEdge[]   // { affordanceId, viaKeys }
```

It is deliberately shared between `Session.skillPlan()` and the testing linter so the two can never
disagree — the same anti-drift argument this model rests on, already load-bearing in production code.

**What is actually missing is three things, none of them architectural:**

| Derivation | State today | The delta |
|---|---|---|
| **enables** | implemented, correct, proven — but scoped to *a skill's step list*, and not exported | call the same function with **a place's action list**; expose it; serve it on the row |
| **awaits** | the facts exist (`busy`, `pending()`, settlement) | join them: *"B waits because A is in flight"* |
| **authorizes** | the chain exists (`highEffect` → ask → spend) | expose it as a **relation**, not only as ask-book arms |
| **reachability** | `navigatesTo` claims exist; the linter already reasons about unreachable pages | walk the claims to answer *"how do I get to checkout?"* |

## The delta, stated once

- **Nothing to restructure.** No declaration changes shape.
- **One function to generalise** (`stepDependencies`, from skill-steps to any action list).
- **Three joins to write**, all over data already in hand.
- **One thing to enrich**: `JourneyDef`, so a real flow config can be translated into it without loss.

That is the entire distance between 0.11.0 and the model — which is why the model reads as though it
were designed in from the start. It nearly was; it was applied to skills first, and never widened.

## The naming consequence (feeds the 1.0 freeze)

An app author declaring `tools: {…}` is declaring *what a person can do on this page*. "Tool" is
agent-side vocabulary that leaked into the authoring surface. Under this model the authoring word
should be **actions**, with "tool" reserved for what is *served* to a model — the same
one-word-per-audience question as journeys-versus-skills (`context-engine-api.md` D6). Both are the
same decision and should be taken together.

---

# Stage 0 — The lifecycle everything else rests on

Three moments, and knowing which one a thing belongs to answers most design questions before they are
asked.

| Moment | What is registered | Nature | Why there |
|---|---|---|---|
| **Build** (`buildNavigationGraph`) | pages, routes, conditions, journeys | static data | a map and a plan can be linted, shared and versioned *before anything runs* |
| **Session attach** (`fromLiveStore`) | actions that only exist at runtime — feature-flagged, server-driven | runtime-**declared** | the app learns of them late; still nothing is wired |
| **Component mount** (`registerToolGroup`) | handlers, `enabled`, `busy`, `holds` | runtime-**wired** | these change while the page is open |

**The rule that falls out:** *if a fact can change while the page is open, it is a wire, not a
declaration.* That single line decides where every new feature goes — and it is why `busy` is a wire
(`setBusy`) and why a declarative `busyWhen` was refused.

**The honesty bridge between phases.** The map is optimistic: it declares what *can* exist. The runtime
knows what *does*. When they disagree — declared but never mounted — the library says so rather than
letting the map write cheques the runtime cannot cash:

- the row carries `materialized: false`
- a fire is refused `NOT_MATERIALIZED`

That marker is what lets the build-time map stay optimistic without ever becoming dishonest.

**Open question — may a journey be declared at runtime?** Actions already can (`fromLiveStore`), and
real apps load flow configs from a server or behind a flag. A journey is a *plan*, so its natural home
is build time; but if runtime journeys are needed, they should ride the existing live-source path
rather than inventing a second mechanism. **Decide, do not drift.**

---

# Stage 1 — Navigation context

*"Where am I, what places exist, and where can I go from here?"*

## 1.1 Today

```ts
import { buildNavigationGraph, fromRoutes } from 'hcifootprint';

const app = buildNavigationGraph('shop', {
  nodes: {
    catalog:  { does: 'Browse products', route: '/catalog',  tools: { /* … */ } },
    checkout: { does: 'Pay',             route: '/checkout', tools: { /* … */ } },
  },
});

const session = app.createSession();

// the app tells us where it actually is (the bridge — one line, at the router)
session.sync(matchRoute(pages, location.pathname) ?? location.pathname);
```

**What works:** places, routes with `:params`, areas/tabs/modals, `repeats` + `instances`, one
declared destination per action (`goTo`), cursor movement on a claim, `arrival: 'claimed' | 'observed'`.

**What does not:** an existing app must hand-translate its route table; a step can only claim ONE
destination; there is no notion of a step *inside* a page; there is no progress ("step 2 of 5").

## 1.2 Proposed

### (a) The bridge is taught first, not last

It is load-bearing for three separate features (arrival corroboration, live re-read, conditional
destinations) and today it is buried in an adoption recipe. It becomes step one of getting started:

> **Wire this one line and the library can see where you are. Skip it and everything still works —
> the library simply says it does not know.**

### (b) We define the port; they implement it

**The adapter rule:** the library ships an adapter **only for a shape that is public, versioned and
standard** — react-router route objects, TanStack Router, Next's app directory. One shape, documented
by someone else, shared by thousands of apps.

```ts
import { fromReactRouter } from 'hcifootprint/adapters/react-router';

const app = buildNavigationGraph('shop', {
  sources: [fromReactRouter(routes)],   // a PUBLIC shape — safe to adapt
});
```

**There is no adapter for an app's own flow config**, and there must not be. There is no such thing as
"a wizard config" — there is *one company's* `WizardTreeConfig`, private to their codebase and free to
change next sprint. An adapter for it would be a library feature bound to one consumer's private type.

Instead, the **driver pattern**: we publish the target type, they write the translator.

```ts
// in THEIR codebase — ~20 lines, their config stays the source of truth
const checkoutJourney = toJourney(theirWizardConfig);

const app = buildNavigationGraph('shop', {
  sources: [fromReactRouter(routes), fromJourneys([checkoutJourney])],
});
```

Two things make that translation safe without the library guessing at shapes:

- **A typed target** — the translator is a pure function into our exported types, so a bad mapping
  fails at compile time, not at runtime.
- **`lintGraph`** (already shipped in `hcifootprint/testing`) — a translated graph is linted in their
  own test suite: *"this step declares an edge to `configure`, which no step declares."* A translation
  bug fails in CI, not in front of a user.

**Rejected: a generic shape-mapper** (`{ stepsPath: 'steps', idKey: 'id', … }`). It handles field
renaming and dies on the first structural difference — nested `all`/`any` conditions cannot be
expressed as a field map. General-looking, broken on every real case.

**What ships instead of the adapter:** a cookbook page with a complete worked translator, using a real
flow config as the example. Documentation, not API — and here the example *is* the feature.

**The consequence, which is the point:** if consumers write the translator, **our target shape must be
rich enough to receive what their config says.** Today it is not — a translation into `JourneyDef`
would silently lose conditional edges, priority, intra-page steps and progress. That is where the
effort goes, and it benefits every consumer rather than one.

### (c) Conditional destinations, read from their config, disclosed not decided

Their config already says this, and maintains it for their own correctness:

```ts
edges: [
  { to: 'evaluation', when: { truthy: 'data.trainingJobStarted' }, priority: 10 },
  { to: 'configure' },                        // unconditioned = fallback
]
```

**Laws** (each a test):

1. **Priority is the resolution law** — eligible edges sort by priority, highest wins, the
   unconditioned edge is the default. No scoring, no "most likely".
2. **We evaluate to DESCRIBE, never to ACT.** The app navigates. If our reading is wrong, `sync()`
   corrects the cursor and nothing was caused.
3. **Unevaluable is said out loud.** A condition over roots we were never told about (`flags`,
   `params`, `query`) is disclosed as opaque text and marked unevaluable — the `guardUnevaluated`
   arm we already ship. We never guess it true or false.
4. **Arrival corroborates against the set.** Landing on any declared candidate marks `'observed'`;
   landing outside is not a failure verdict — it means the declared set was incomplete.

### (d) Intra-page steps and progress

```ts
{ id: 'hotspotSelection', route: null }   // a step inside a page
```

Served as a place with no URL. Honest limit to document: back-navigation across intra-steps is
genuinely hard (the field's own engine needed a `collapseTrailingIntraSteps` pass), so this ships with
its complexity stated, not hidden.

Progress rides along: `order`, `totalSteps` → the row can say **"step 2 of 5."**

---

# Stage 2 — Action context

*"What can be done here, and what is true about each one right now?"*

## 2.1 Today

**Declared** (in the graph — the contract; no runtime strings ever cross from here to the model
without passing the injection firewall):

```ts
tools: {
  'place-order': {
    does: 'Place the order',
    binding: { kind: 'element', locator: { role: 'button', name: 'Place order' } },
    enabledWhen: { truthy: 'checkout.paymentReady' },
    writes: ['order.id'],
    goTo: 'order-review',
    confirm: true,              // high-effect
    input: OrderSchema,
    verify: { /* did it really happen */ },
  },
}
```

**Wired** (at runtime — the live facts):

```ts
const group = session.registerToolGroup('checkout', { 'place-order': handler });
group.setEnabled('place-order', false);
group.setBusy('place-order', 'Placing your order…');
```

**Served** (what the model receives per action): `does`, `expects`, `enabled`, `busy`, `holds`,
`goesTo`, `highEffect`, `materialized`, `guardUnevaluated`, and on refusal `evidence` + `retriable`
+ an authored why.

## 2.2 Proposed

Three additions, each already designed:

| Addition | What it says | Status |
|---|---|---|
| `blockedBecause: { says, clearedBy }` | the app's own reason, and **who** clears it — `'app'` (wait) / `'user'` (interrupt) / `'invalid'` (report) | Round B, gated on the field re-drive |
| `humanDecides: { about, doneWhen }` | this choice is a person's to make; the agent presents and stops | Round A, designed in `human-decisions.md` |
| `working` via `setBusy` | already shipped — listed so the set reads whole | 0.10.0 |

The shape of the pair stays constant and is worth stating as the rule:

> **Declared = the contract (static, in the graph). Wired = the live fact (dynamic, on the handle).**
> A fact that can change while the page is open is a wire, not a declaration.

---

# Stage 3 — Edges between actions

*"After I do this, what becomes possible?"*

This is the piece with no shipped answer. The tempting design — a second graph of explicit
action-to-action edges — is refused in `context-engine-api.md` D4: it duplicates the graph, and two
structures that can disagree is the failure this library exists to prevent.

## 3.1 The realisation: the edge is already declared — twice, by accident

An app that writes this:

```ts
'attach-receipt': { does: 'Attach the receipt', writes: ['receipt.uploaded'] },
'next':          { does: 'Continue',            enabledWhen: { truthy: 'receipt.uploaded' } },
```

…has **already declared the dependency**. `attach-receipt` writes the key that `next` waits on.
Nobody wrote an edge, and yet the edge is unambiguously there.

**So it is derived, never declared.** Both halves already exist and are maintained for other reasons
(`writes` powers verification; `enabledWhen` powers availability). Nothing new to keep in sync, nothing
to drift.

## 3.2 The shape

```ts
session.whatUnblocks('checkout.next');
// → [{ actionId: 'checkout.attach-receipt', viaKey: 'receipt.uploaded' }]
```

And served, on a disabled row, in the model's own words:

> **Continue** — not available yet. The app is waiting on `receipt.uploaded`, which **Attach the
> receipt** writes.

That single sentence answers the field report's opening incident: *the agent poked a disabled control
in a loop because it could not tell what would change it.*

## 3.3 Laws

1. **Derived, never authored.** There is no action-edge declaration to write, so there is nothing to
   drift. If someone must express a dependency that no `writes`/`enabledWhen` pair captures, that is
   the trigger to revisit explicit edges (D4) — and only then.
2. **A claim, not a promise.** `writes` is the app's *claim* that it changes a key. So the derived
   edge is a claim too, and is served as one: *"the app says Attach writes this"* — never *"do this
   and Continue will light up."*
3. **Silence over guessing.** No `writes`, or an `enabledWhen` over keys nobody claims to write →
   **no edge**, and the row honestly says nothing about what would unblock it. Absence, not invention.
4. **Never a plan.** We list what unblocks; we do not order it, score it, or tell the agent to fire it.
   Ordering intent is a journey, which is declared.
5. **No cycles asserted.** If A and B write keys each other waits on, both edges are reported as
   stated — we describe the declarations, we do not resolve them.

---

# How the three connect

One place, one action, one dependency — end to end.

```ts
// 1 · NAVIGATION — places, from what they already have
const app = buildNavigationGraph('expenses', {
  sources: [fromReactRouter(routes), fromWizardConfig(expenseWizard)],
});
const session = app.createSession({ navigate });      // their navigate, optional
session.sync(matchRoute(pages, location.pathname));   // the bridge — the one line

// 2 · ACTIONS — the contract is declared, the live facts are wired
//    (declared in the graph, above; wired here)
const group = session.registerToolGroup('categorise', {
  'attach-receipt': (file) => upload(file),           // async: the promise IS completion
  'next': () => wizard.goNext(),
});
useWorking({ busy: upload.isPending, label: 'Uploading the receipt…', tools: group, session });

// 3 · EDGES — nothing to write. Derived from writes × enabledWhen.
```

**What the model then receives, in one read:**

```
You are on: Categorise receipts   (step 3 of 4)

Actions here:
  attach-receipt  — Attach the receipt        [working: "Uploading the receipt…"]
  next            — Continue                  [not available]
                    waiting on: receipt.uploaded
                    which "Attach the receipt" writes
                    leads to: Review, or Fix errors — the app decides,
                              depending on whether the form validates

Waiting on you: which category each receipt belongs to
```

Every line traces to something the app **already declares or already wires**. Nothing in that block is
guessed, and anything unknown would say so.

---

## Build order

| | What | Depends on | Size |
|---|---|---|---|
| 1 | The bridge taught first + `fromReactRouter` | nothing | S |
| 2 | `whatUnblocks` (derived action edges) | nothing — `writes`/`enabledWhen` already exist | **S–M** |
| 3 | **Enrich `JourneyDef`**: conditional edges + priority (disclosure), intra-page steps, progress | 1 | M |
| 4 | The translator cookbook (worked example, not API) | 3 | S |
| 5 | Round A (`humanDecides`) | designed | M |
| 6 | Round B (`blockedBecause`) | the field re-drive | M |

**Item 2 is the surprise: the highest-value piece is one of the cheapest**, because the data already
exists and nobody has to declare anything new.
