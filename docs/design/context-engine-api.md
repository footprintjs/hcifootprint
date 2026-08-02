# The Context Engine — a 1.0 API proposal

Status: **PROPOSAL, for discussion.** Nothing here is built. Written against the shipped surface at
0.11.0. Every **Today** block is real code you can run now; every **Change** block is proposed.
Decisions the owner must make are marked **YOUR CALL**.

> **Read the names here as 0.11.0 names.** D6 below has since SHIPPED — 1.0 renamed skills to
> journeys and tools to actions, and deleted the old names rather than aliasing them. So
> `skillsAsTools`, `registerToolGroup`, `SkillDef2` and `skillGraph` appear below as the problem
> this note was written to describe, not as anything you can call. The CHANGELOG's 1.0 section
> carries the full mapping. Everything else here is still a proposal.

Format of each item: what a *product* person needs to know, then the *technical* shape, then
today-versus-proposed side by side.

---

## What we are building, in one sentence

> **A context engine for web apps: it gives an LLM the app's own account of where it is, what it can
> do, and what happened — and says so when it doesn't know.**

Every context framework decides what to *include*. This one also *attests*, and can answer
"unknown". **Context engineering** is the category; **honesty** is the difference.

**1.0 is not "more features."** 1.0 is: the seven context kinds below, one coherent API, names
frozen, adoptable in five minutes.

| Context kind | Product question | Technical surface | State |
|---|---|---|---|
| Navigation | where am I? | graph + cursor | shipped |
| Action | what can I do here? | `whats_here` rows | shipped |
| Conditional | what's live right now, and why not? | `enabled`, `evidence` | shipped 0.11.0 |
| Capability | is this really wired? | `materialized` | shipped |
| Progress | is the app busy? | `busy`, `stillWorking` | shipped 0.10.0 |
| Outcome | what actually happened? | settlement, `arrival`, `did_it_work` | shipped |
| Authority | who's allowed — agent or person? | `highEffect`, asks, `humanDecides` | partly (D7) |

---

## D1 — Entry: an existing app must reach the map in five minutes

**Product.** Today an app can't adopt us quickly, because the map is hand-written. That kills
adoption at minute one, before anything good happens.

**Today** — real, works now:

```ts
const app = buildNavigationGraph('shop', {
  nodes: { /* hand-authored, page by page */ },
  sources: [fromRoutes(routes), fromJourneys(journeys), fromLiveStore(store)],
});
const session = app.createSession();
```

`fromRoutes` wants **our** shape, so an existing react-router app must translate its route table first.

**Change** — one adapter that eats their config verbatim:

```ts
import { fromReactRouter } from 'hcifootprint/adapters/react-router';

const app = buildNavigationGraph('shop', {
  sources: [fromReactRouter(routes)],   // their objects, untouched
});
```

Pure function, no runtime, its own subpath — the shape `/sensor` and `/react` already prove.

**YOUR CALL #1.** Ship **react-router only** in 1.0? (My recommendation: yes — a second adapter is
earned by a second real consumer, not anticipated. Same rule as one chart bridge in vizfootprint.)

---

## D2 — One blessed path

**Product.** Three ways to build the same thing is three ways to get it wrong, and three things to
document.

| | Today | Change |
|---|---|---|
| Ways to build a graph | hand-authored `nodes`, or `sources`, or both | **sources first; `nodes` is the override** |
| Docs show | all three | one canonical path, override noted once |

That order already wins inside `mergeSources`, and it matches how adoption actually goes: start from
what you have, hand-write only what you must.

**YOUR CALL #2.** Adopt sources-first as canonical?

---

## D3 — Conditional destinations: the real gap you found

**Product.** "Press Submit — you'll land on the review page, *or* the fix-errors page, depending on
what's in the form." Today the library cannot say that. It can only say *one* destination, so the
agent plans against a future that may not happen.

**Today** — a single claim:

```ts
tools: {
  submit: { does: 'Submit the order', goTo: 'order-review' },   // ONE page id, always
}
```

If the app actually navigates to `fix-errors`, the library recovers honestly — `sync()` moves the
cursor to the real page and `arrival` stays `'claimed'`, never falsely `'observed'` — but the agent
**could not have known** two outcomes were possible.

**What already exists.** The session already accepts the app's own navigate function:

```ts
navigate?: (href: string) => void | Promise<void>;   // shipped
```

The app hands it over once; the library uses it for pure URL edges. Two laws are already recorded on
it and both matter here: **registered handlers still win**, and **without this option nothing changes
— fail-closed, byte-identical.** So it is opt-in and severable by construction: don't pass it, and the
library never navigates anything.

**What is NOT proposed — and why.** Three tempting shapes are refused:

- **A navigation helper the library owns** (`session.goTo('x')` as the app's routing call). Refused:
  it would make the app's routing depend on us — remove hcifootprint and navigation breaks. Every
  declaration we ship is severable; this would not be. (Handing us *their* function, as `navigate`
  already does, is the opposite and is fine: we call what they gave us, or nothing at all.)
- **The library evaluating a condition to PICK the destination.** Refused, and this is the important
  one. Our condition would read the *projected state we have been told about*, which can lag or
  simply not contain what the real branch tests — an app's `if (isValid)` may hang off a form
  library's validity flag it never reported. We would then navigate confidently to the wrong page:
  the exact class of failure this library exists to prevent, except caused by us rather than reported
  by us. **The app decides; we record.**
- **Per-action destination reporting** (the handler tells us where it went). Unnecessary — see below.

**One additive improvement this seam does deserve.** An app that passes `navigate` today must ALSO
wire the sync bridge, or we perform navigations whose outcome we cannot see. Since we are already
calling their function, the destination can be recorded **at the moment we call it** — one wire
instead of two, no drift, and no condition evaluated on our side. Small, additive, and it strengthens
the seam rather than widening our authority.

**What already solves it, with no declaration at all.** One line, once, at the router:

```ts
useEffect(() => {
  session.sync(matchRoute(pages, location.pathname) ?? location.pathname);
}, [location]);
```

With that bridge wired, conditional navigation is **already handled today**: the handler branches
however it likes, calls its own `navigate()`, and the bridge reports wherever it actually landed. The
app keeps its navigation; we observe it. No second copy of the branching logic to drift.

**Change** — an *optional* forward-looking declaration, for planning only:

```ts
tools: {
  submit: {
    does: 'Submit the order',
    goTo: {
      mayReach: ['order-review', 'fix-errors'],   // the app picks; the agent must not
      because: 'whether the form validates',      // app's words, data channel
    },
  },
}
```

What the agent's row then says: *this action leads to one of these places, chosen by the app, for
this reason — fire it and re-read; do not assume which.*

**The laws this must obey** (each is a test):

- `mayReach` is a **claim about possibilities**, never a prediction. `arrival` still only becomes
  `'observed'` when a real `sync()` matches one of them.
- Landing **outside** the declared set is not a failure verdict — it is recorded, and the honest
  reading is "the app declared an incomplete set", not "the navigation broke".
- The library never picks. No scoring, no "most likely destination" — that is meaning, and it is the
  app's.
- A single-string `goTo` keeps working verbatim; this is additive.

**The concrete payoff, which is smaller but real.** Today, declaring `goTo: 'order-review'` while the
app legitimately navigates to `fix-errors` leaves `arrival` at `'claimed'` forever — the observation
never matches the single declared target. That reads as *"never corroborated"* when the truth is
*"went to the other valid place."* With a declared **set**, arrival corroborates against any member,
so a legitimate conditional navigation is honestly marked `'observed'` instead of looking unverified.

**YOUR CALL #3.** Ship `mayReach` in 1.0 as optional sugar? (Recommendation: **yes, but clearly
secondary** — the sync bridge is the mechanism and must be what the docs teach first. Declaring
nothing stays fully valid: the agent then learns the destination after the fact instead of before.
Anything that makes `mayReach` feel mandatory has mis-taught the model of how this works.)

---

## D3b — What the field's own wizard engine teaches (evidence, not theory)

A production integration's `WizardTreeConfig` and navigation engine were read directly. Three findings
change this proposal.

**1. They already declare conditional destinations — as data they maintain for their own correctness.**

```ts
edges: [
  { to: 'evaluation', when: { truthy: 'data.trainingJobStarted' }, priority: 10 },
  { to: 'configure' },                       // unconditioned = the fallback
]
```

`priority` is the resolution law: eligible edges sort by priority, highest wins, the unconditioned
edge is the default. Declared, deterministic, inspectable — **no scoring and no guessing.** If we ever
express conditional destinations natively, this is the shape to copy rather than invent, and the
adapter (D1) should read it rather than ask for a second copy.

**2. Their engine independently derived our declare/perform split.**

```ts
resolveNavigation(stepId, ctx): NavigationResult   // pure — no side effects
executeNavigation(result, actions): void           // "the only function with side effects"
```

A decision computed as *data*, executed separately. That is our boundary law, and vizfootprint's
plan-don't-execute, arrived at independently by a consumer. Strong evidence the line is drawn right.

**3. It corrects an over-refusal earlier in this document.** D3 refuses "the library evaluates a
condition to pick a destination". That refusal holds only for *acting*; it was drawn one notch too far.
Two different acts:

| Act | Verdict | Why |
|---|---|---|
| Evaluate a condition to **navigate** | still refused | our state view may lag; we would send the user to the wrong page — an error we *caused* |
| Evaluate a condition to **describe what is next** | allowed | pure disclosure, and we already do exactly this for `enabledWhen`, with `guardUnevaluated` as the honest-unknown arm |

Being wrong while describing costs nothing: the app still navigates, `sync()` corrects the cursor, and
`arrival` stays `'claimed'`. So conditional edges may live on a journey step, **evaluated for
disclosure only**, with the unknown arm we already ship.

**The complication to solve, not paper over.** Their `deciderContext` has four roots — `data`, `flags`,
`params`, `query` — where our `WhereFilter` reads one projected state. Route params and feature flags
are not app state in our sense. Options: (a) the app maps them into reported state, or (b) we disclose
such a condition as **opaque text, marked unevaluable**. Recommend **(b) first** — honest, costs the
app nothing, and forces no restructuring; (a) becomes an upgrade they can choose.

**A warning label on F3c.** `route: null` steps are real (`hotspotSelection`), which is the field
evidence that unparks intra-page states — but their `collapseTrailingIntraSteps` exists because back
navigation across intra-steps is genuinely hard. F3c is justified, and it is not small.

**YOUR CALL #3b.** Adopt conditional edges + `priority` onto journey steps, evaluated for disclosure
only? And read them from the app's own wizard config via an adapter rather than asking for a re-declaration?

---

## D4 — Action connections: your action-edge question

**Product.** Real dependencies are between *actions*, not pages: *upload finishes → Next becomes
usable*; *pick cost centre → Submit becomes usable*. You were right that the field report hung these
on navigation edges only because that's the only edge the library has.

**Shape A — first-class action graph.** `edge({ from: 'attach', to: 'next', … })`.
*For:* puts the dependency exactly where it lives.
*Against:* one honest step from a workflow engine — once edges carry conditions **and** we evaluate
them to decide what happens next, we are executing policy, not describing it. And it creates a second
graph that can disagree with the first; disagreement is the failure this library exists to prevent.

**Shape B — actions belong to places; journeys carry sequence; per-step metadata carries conditions.**
*For:* no second graph, nothing to disagree. Composes with everything shipped. And per the wave-5
finding: an edge's "kind" already **is** the set of declarations it carries — a separate edge object
would be a classifier, and a classifier is a reading, which is meaning, which is the app's.
*Against:* a dependency that isn't part of a declared journey has nowhere to live today.

**Recommendation: B — because B is a strict subset of A.** Explicit action edges can be added later,
additively, without invalidating anything declared under B. Starting at A cannot be undone.

**Revisit trigger, written down:** a real app with a dependency between two actions that is neither a
journey nor expressible as a condition. Until that exists, A is speculation.

**YOUR CALL #4.** B with the trigger recorded?

---

## D5 — App-side reads: parity with what the model sees

**Product.** Your own UI (and V2's assistant) should be able to ask "what's true here right now?" in
one call — the same picture the model gets.

| | Today | Change |
|---|---|---|
| The model's view | one rich call: rows with `enabled`, `busy`, `holds`, `goesTo`, `evidence`, `materialized` | unchanged |
| Your app's view | assemble from `available()`, `asks()`, `pending()`, `awaitingSettlement()`, `openWork()`, `settlementOf()` | **one typed read of the same picture** |

Not a new mechanism — a typed projection of what the serve layer already assembles.

**YOUR CALL #5.** One read? (Recommendation: yes. V2's entry rules are predicates over exactly these
facts, and the dogfooding rule says our own assistant must consume only the public surface. If it
needs a private hook, the API failed.)

---

## D6 — The name freeze (a hard 1.0 blocker)

**Product.** 1.0 makes every name permanent. Today the public API exports **two names for the same
thing** in three places.

| Today (real exports) | Problem | Change |
|---|---|---|
| `skillGraph`, `SkillGraphBuilder`, `SkillGraph` | the **old** graph name, still exported beside the new one | deprecate → `buildNavigationGraph` / `NavigationGraph` |
| `Session` **and** `InteractionSession` | two session types; unclear which you hold | one public name, the other internal |
| `SkillDef2` | number-suffixed — our own rule forbids it | drop at 1.0 (already aliased to `JourneyDef`) |
| `skillsAsTools`, `SkillPlan`, `commitSkill`, `readySteps` **vs** `JourneyDef` | authors declare *journeys*; the serve layer says *skills* | one word |

**Settled, and shipped in 1.0: `journey` everywhere — with no aliases.** The recommendation below
was to keep aliases for one major; what shipped deleted the old names outright, because an alias
keeps two words alive for one thing and that was the whole complaint. The rest of this section is
the reasoning, left as written. "Skill" now collides with the entire agent ecosystem's meaning of the word, and our own docs
already lean on "journey" for humans.

---

## D7 — What 1.0 does *not* include (each with its trigger)

- **Round A implementation** (`humanDecides`, `decisions()`, `skillStanding`) — designed and settled
  in `human-decisions.md`; builds when capacity allows; not a 1.0 blocker.
- **Round B** (`blockedBecause` — the app's own sentence for *why* blocked and *who* clears it) —
  gated on the field integration re-driving 0.11.0.
- **Explicit action edges (Shape A)** — trigger in D4.
- **`agentMay` enforcement** — v1 discloses; enforcement mints refusal words, and those unions grow
  in lockstep.
- **The V2 assistant package** — separate package, starts after 1.0 is stable.
- **foottrail extraction** — trigger: a genuinely tree-shaped record. Today's session is a linear walk.

---

## Open questions

1. **Does 1.0 wait for the field integration to re-drive on 0.11.0?** (Lean **yes** — a 1.0 validated
   in production is a different claim from one validated by our own tests.)
2. **Benchmark or drop** the "precise context beats a DOM dump" claim. It is currently unmeasured, and
   unmeasured claims are the one thing this library cannot afford.
3. **Keep the package name?** (Lean **yes** — renaming a published package is expensive; let the
   tagline carry the positioning.)
