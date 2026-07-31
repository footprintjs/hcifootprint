# Library asks — the standing intake

Four of this library's releases came out of the same place: somebody wiring a real app hit a
wall, said so, and the wall turned out to be ours. That is the best input this project gets,
and until now it lived in chat logs. This file is where it lives instead.

An **ask** is consumer-shaped: it describes what an integration was trying to do, what
actually happened, and what they are carrying because the library did not do it. It is not a
feature vote and it is not a roadmap. An entry earns its place by carrying evidence, and it
keeps its place after it ships or after it is declined — because the next person to propose
the same thing should find the answer here rather than re-derive it.

## Filing one

Four fields, in this order. Write them before writing any code.

- **Ask** — what the library would do, in one or two sentences, in the consumer's own terms.
- **Evidence** — what actually happened in a real integration. Not "it would be nice if";
  a thing that occurred, with the shape of the failure. An ask with no evidence is a design
  opinion, and design opinions belong in an issue, not here.
- **Workaround** — what the consumer is carrying today, and **what it costs them**. This is
  the field that decides priority: a workaround that is 3 lines and correct is a much weaker
  case than a 53-line shim with a step everyone forgets.
- **Status** — `open`, `shipped in vX`, or `declined` with the reasoning attached.

House rules:

- **No consumer names.** Every entry says *a production integration*. The evidence is the
  point; who reported it is not, and an unnamed report is one anybody can file.
- **Declined entries stay, with the reasoning.** A rejected ask that keeps getting
  re-proposed is a documentation failure, not a stubborn proposer. If the reasoning here does
  not convince you, that is useful — say which sentence is wrong.
- **Shipped entries stay too.** They are the format's worked examples, and they are the
  honest record of how a release was decided.
- **Cite source, not memory.** A claim about current behaviour names the file it came from.
  Where this file and the code disagree, the code is right and this file is stale.

Sections are ordered for the reader most likely to arrive: open first, declined second (the
one a re-proposer needs to hit before writing anything), shipped last.

---

## Open

### One door — a single invocation function used by both the app's UI and the agent

**Ask.** Let a live action declare **one invocation function** that the app's own UI calls and
the agent's fire path calls. Attribution then becomes structural: the library would know who
acted because the call arrived through a different door, rather than by inspecting the event
that reached it. No DOM sensor, no `isTrusted` heuristic.

**Evidence.** Two facts from real integrations, pointing at the same seam. A production
integration shipped a hand-wired human-report wrapper and did **not** check `isTrusted`, so
the agent's own synthetic `element.click()` calls were recorded as human acts — `source:
'user'` stamped on machine motion, which is a lie in the one field the whole provenance model
rests on. And the shim itself was the other half of the report: 53 lines across 21 call sites,
each one a place to forget `invoke: false` and run the click twice.

**Workaround.** `isTrusted`, which the sensor now reads by default
(`src/sensor/watch-page.ts:88`) — and it works. The consumer's own framing, kept because it is
the honest one: *this is ergonomics, not a blocker.* What it costs is a shape rather than a
bug: attribution is a **detected** property of an event, so the library can only ever say "no
synthetic event reached me", never "no synthetic call happened".

**Sharpenings** — three things this needs before it is buildable, each of which came from
reviewing the ask rather than from the report:

1. **The wrapped invoke takes an optional `source`, defaulting to `'user'`.** An app calling
   its own action from a timer, an effect, or a retry is `'system'`, and filing that as a human
   act is exactly the laundering this library exists to prevent. The default must be the common
   case (a person clicked), and the escape hatch must exist and be one word.
2. **A stated precedence rule against the sensor**, so one human act can never produce two
   ledger rows. The mechanism is already there and already named: `reportedElsewhere` is
   "the stand-down list such a control would register itself on" (`src/sensor/types.ts:123`),
   so the rule to write is which door wins, not which door to build.
3. **It is a ladder rung, not a rival.** Apps with an action registry get the one door; apps
   with scattered handlers get the sensor; greenfield components get the hook. The sensor does
   not become legacy the day this lands — most apps will never have the registry.

**Where it would go.** `fire()` is already the one invocation chokepoint
(`src/traverse/session.ts`, the capability-refusal block around :1054), with every handler call
site below the gates — which is why this is a rung and not a rewrite. The seam is written down
in source at `src/sensor/watch-page.ts:68-87`: a one-door `perform()` over that chokepoint
makes the mis-attribution class **unreachable** rather than merely detectable.

**Status** — `open`. Ergonomics, by the consumer's own account; sequenced behind anything with
a correctness failure behind it.

### `reads?: string[]` — the honest twin of `writes?`

**Ask.** Let a tool declare the state keys it **reads**, beside the `writes?` it can already
declare (`ToolDef.writes`, `src/tree/types.ts:54`; `Effect.writes`, `src/atom/types.ts:112`).
Same trust class as `writes` and stated the same way: *a checkable claim, never a truth*
(`src/atom/types.ts:107`).

**Evidence.** No field failure yet — recorded as such, because the format asks and inventing
one would be the first thing this file is for. What exists is a structural gap anyone reading
the source can see: `session.why(key)` is a real backward slice over the footprintjs commit
log, and the read side of that slice comes from `#readsByStep`, which is populated **only**
from the session's own tracked reads (`src/traverse/session.ts:399-404`). A handler that reads
the app's store directly contributes nothing, so lineage answers *which action wrote this* and
never *what that action looked at*.

**Payoff.** Declared read keys would flow straight into the machinery that already exists —
`sliceForKey(..., keysReadFromMap(...))` at `src/traverse/session.ts:1974` — so data lineage
would explain itself for free, with the same honesty marking untracked reads already get. That
is the whole case: no new subsystem, one declaration feeding a slice that is already computed.

**Workaround.** None is being carried, which is precisely why this sits below the one-door ask:
consumers get `why()` for writes today and have not reported missing the read half.

**Status** — `open`. Cheap, additive, and waiting for one real report to justify the surface.

### `sameAs` — one action under two names, and a report when two names collide

**Ask.** Let an action declare an **alias**, so an app whose own vocabulary drifted from the
graph's (a renamed button, a legacy id still used by the store, two teams naming one control)
can serve both names for one action — and let the library **report** when two declarations claim
the same name, rather than picking one.

**Evidence.** Real, and it arrives from two directions at once. A live store publishing under the
app's own id, beside a graph that already declares the same control under an authored id, is
today two actions: the merge order binds one and mount-declares the other, and only a person
reading both files can see they are the same thing. And a model handed a name from prose retypes
the name it read — `do_action`'s resolution ladder already softens that for a *near* miss, which
is exactly the machinery an alias would have to reach through.

**Workaround.** Renaming one side to match the other, which is a rename in an app the library
does not own; or living with two rows. Cost: unmeasured — nobody has reported a number, which is
why this is parked and not queued.

**Why it is not in 0.9.0.** It looked like one field and it is not. An alias has to resolve
**through** every place an id is the identity: `do_action`'s resolution ladder and its
`UNKNOWN_ACTION` id list, `notHereData`'s *on another page / conditions unmet* arms, `why()` and
the explanation surfaces, journal attribution (a confirm chain keyed to one id, spent by a fire
carrying another), and now the value door — `canonicalHoldsKey` (`src/traverse/session.ts`) exists
as one function today precisely so an alias resolves through it rather than filing a second key,
because one control with two readers would serve whichever was written last, which is the
guessed-value class `holds` refuses. The **collision report** is the other half and cannot be
skipped: an alias feature that silently prefers one claimant would launder an authoring mistake
into a served fact.

**Status** — `open`, parked for its own design round. It earns that round when someone reports the
cost of carrying two names; it does not get bolted onto a release built around other seams.

### `did_it_work` that waits — a ceiling on the long-running door

**Ask.** Let the polling door wait a little instead of answering immediately, so an agent watching a
two-minute upload does not spend a turn per poll.

**Evidence.** The surviving half of the awaited-call ask below. `settleWithinMs` covers the call
that **fired**; nothing covers the caller that comes back later and finds the same fire still in
flight, which is exactly the shape a work row describes.

**Workaround.** Poll. Cost: a turn per poll, and the **model** picks the cadence — a clock a model
set, which is the one hand this library keeps clocks out of.

**Status** — `open / parked`, and the shape is already decided if it is ever built. It cannot be a
tool **argument** (that is the declined entry below: the fixed tool array's bytes), so it would have
to be an `mcpServer` option applied to `did_it_work` the way `settleWithinMs` is applied to a fire —
the ceiling stays the transport's, never the model's. It is parked rather than queued for the reason
the fold's own documentation gives: this server sends **no progress notifications**, so a ceiling
long enough to be worth having is long enough for the *client* to give up first and report an error
about an action that may well have succeeded. It unparks the day there is a progress story, or with
a field report naming a host whose timeout leaves real room.

---

## Declined

### The app's DATA as a fourth pillar

**Ask.** Beside the three things a `whats_here` result already carries — where you are, what
can be done here, and what has actually happened — add a fourth: the app's own data, declared
so the model answers from what the app has rather than from what it remembers.

**Evidence.** Real, and the motivation is sound: a model asked about the user's cart, their
orders, their current draft should not be guessing, and an app that holds all three has an
obvious wish to hand them over.

**Declined, and why** — three reasons, any one of which is sufficient:

1. **The promise cannot be verified by this library.** "The model answers from what the app
   has" is a claim about the model's reasoning, and nothing here can observe it. The
   ecosystem's own experiments measured this directly: serving data to a model does not mean
   the answer used it — access is not use. A pillar whose headline claim is unverifiable would
   present a claim as a fact, in a library whose entire design is the opposite of that. Every
   other honesty marker in this codebase exists to avoid exactly this move.
2. **The lawful path already ships.** A read modelled as an action gets you the same outcome
   with none of the unverifiable claim: declare a tool whose handler **returns** the data, and
   the return rides `produced` into the model's result — sanitized and capped, on the data
   channel, never as planner instructions. That is a real mechanism with a real settlement
   behind it, and it is now written down:
   **[a read is an action](https://footprintjs.github.io/hcifootprint/docs/serve/reading-data)**.
3. **The industry evidence points the same way.** The emerging browser-side standard for
   agent-facing apps is deliberately **tools-only** — it exposes actions and no data-declaration
   surface — and the earlier generation of "declare your data for models" file formats saw
   effectively no consumption. Two independent bets against the shape. (Stated as the research
   reported it, which is the right confidence for a claim this file cannot re-run.)

**What was taken from it.** The research behind this ask was not wasted, and declining the
pillar is not declining the findings:

- **`redactedFields`** — the redaction `redactedKeys` never did. Chasing "what happens when an
  app returns real data through a handler" is what surfaced that a fire's payload, a handler's
  return, and the input on an approval card were all governed by nothing. See the entry below.
- **The read-is-an-action guidance** — the question the pillar was answering is a real question
  consumers ask, and it now has a documented answer instead of a silence that invited a fourth
  pillar.

**Status** — `declined`. Re-proposing it means answering reason 1: name the mechanism by which
this library could *check* that the served data was used. If that mechanism exists, the rest
follows and this entry is wrong.

### A gesture-kind proof table

**Ask.** Publish a table of gesture kinds — click, type, select, submit — saying what each one
**proves** about the app, so a consumer reading a sensor report can conclude that the action was
performed.

**Evidence.** Real and sympathetic: a team wiring the human sensor wanted one place to look up
*what does a click on this kind of control mean happened?*, and was writing that table themselves.

**Declined, and why** — two reasons, either sufficient:

1. **It is MEANING, and meaning is the app's.** The library's half of the boundary is mechanism
   plus honesty: it observes a gesture on an element the app declared, and it records who did it.
   What a gesture *means in your product* — which press is the act, whether a click on this
   control constitutes an order — is the app's own statement, and this library already has the
   doors for it: `ControlDeclaration.commits` says *not yet* per element per moment, `writes` +
   `effectVerified` say whether the declared effect landed, and `verify:` asks the app's own
   condition at settlement. A table shipped from here would be us asserting the one thing we
   promised to let the app say.
2. **It would launder coincidence into proof.** The sensor sees a gesture; it does not see your
   handler run, and the browser ran that handler before the report was even written. *A click
   happened on the element declared for this action* and *this action was performed* are two
   facts, and the gap between them is exactly where a table with the word **proves** in it would
   quietly close. Every honesty marker in this codebase exists to keep that gap visible —
   `arrival` was given two values and no third for exactly this reason.

**What was taken from it.** The real question underneath — *how do I know it actually happened?* —
is answered by mechanisms that already ship and are now easier to find: `verify:`,
`effectVerified` / `writesObserved`, `did_it_work`, and (for the one case with no writes to watch)
`arrival`. The docs, not a table, are where that belongs.

**Status** — `declined`. Re-proposing it means naming a gesture whose kind alone lets this library
*observe* that the app did the thing. If one exists, this entry is wrong.

### Auto-merging two action declarations by object identity

**Ask.** When the same action reaches the session twice — a graph-declared tool and a live store's
own entry, or one control published by two sources — decide they are the same action by comparing
the **objects** the library was handed, and merge them automatically instead of serving two rows.

**Evidence.** The underlying problem is real and reported: an app's own vocabulary drifts from the
graph's, so one control arrives under two names and an agent is offered it twice. That half is
filed as an open ask (**`sameAs`**, above), because it is a real cost.

**Declined, and why.** The proposed mechanism is a guess presented as a fact. **Object identity
carries no information about whether two declarations describe the same action** — and it fails in
both directions, silently:

- a store that builds fresh objects on every read (the ordinary shape, and the one
  `useSyncExternalStore`-style stores encourage) makes every action look brand new, so nothing
  would ever merge;
- a store that caches and mutates in place makes an **edited** action look like the same object,
  so a merge would carry the old declaration forward under the new one's name.

Either way the library would be answering *are these the same action?* with a heuristic and then
serving the answer as structure — on the surface a model plans over. The identity the reconciler
uses instead is a statement the app actually made: `${node}.${name}` plus `instance`
(`src/graph/sources/from-live-store.ts`). Same-kind id collisions **refuse** rather than pick,
which is the same stance one level up.

**Status** — `declined` as a mechanism. The need it points at is open under `sameAs`, where the
merge is something the app **declares** and a collision is **reported** rather than resolved.

### `awaitSettlement` / `timeoutMs` as arguments on `do_action`

**Ask.** Two new arguments on the tool a model already calls: wait for the app to finish, up to a
caller-supplied ceiling, and answer with the settled truth in the same turn.

**Evidence.** Real, and the underlying need shipped (see *Wait for the app before answering the tool
call*, below). A remote caller that fires and gets `effectStatus: 'pending'` has a receipt for
something that has not happened, and the turn it spends asking again is a real cost.

**Declined as specified, and why** — three settled designs, any one of which is sufficient:

1. **The fixed tool array.** Mode B's whole design is a tool set whose bytes never change: that is
   what keeps a host's prompt cache warm and removes `tools/list_changed` churn. Two new properties
   on `do_action`'s input schema change those bytes for **every** caller, every turn, including the
   ones that never wanted the feature. Pinned by a test that reads the tool array's bytes and refuses
   `awaitSettlement`, `timeoutMs` and `settleWithin` (`test/settled-answer.test.ts`).
2. **`call()` is synchronous by contract.** The port hands back a `ServeResult`, not a promise, and
   that is what lets a relay, a test double or a hand-rolled facade implement `SkillToolsPort` at
   all. An argument that only means something when the port awaits would make the published contract
   a lie for every implementation that cannot.
3. **The ceiling is a fact about the waiter, never about the work.** A model-chosen minutes-long wait
   is worse than useless over MCP: this server sends **no progress notifications**, so a long ceiling
   buys no patience from the host — the **client** gives up first and reports an error about an
   action that may well have succeeded. A clock may decide how long to wait; it may never decide what
   the answer is.

**What was taken from it.** All of the need, none of the shape. `port.settledAnswer(transitionId)`
is the settled truth as a **result** — one builder shared with `did_it_work`, so the two doors cannot
teach different things — and `mcpServer`'s existing `settleWithinMs` fold now spreads it whole
instead of hand-patching three fields. The wait itself stays where waiting already belonged: the
**transport**, one boundary, one ceiling, chosen by the host.

**Status** — `declined` as specified, `shipped in 0.10.0` as the core. Re-proposing the arguments
means answering reason 1: name how a per-call argument reaches the model without changing the tool
array every caller reads.

### An off switch for the MCP fold

**Ask.** A way to turn the `settleWithinMs` fold off entirely (`false`, or a `fold: false` option),
so a result crosses exactly as the port built it.

**Evidence.** Sympathetic and easy to picture: a host doing its own settlement bookkeeping does not
want a server rewriting results underneath it.

**Declined, and why.** Withholding an answer the session is **already holding** is the only
dishonest move available at that boundary — the result would say `'pending'` about a fire the library
knows has finished, and the caller would have to ask again to learn what the server had in hand when
it answered. That is the confident-staleness failure this library keeps closing, chosen on purpose.
`0` is therefore the *shortest* ceiling and not an off switch: the timer is a macrotask, so a
settlement already in hand still wins the race and is still folded in.

**And the unfolded result already has a door.** `skillsAsTools(session)` is the port, and the port
never folds anything — `mcpServer` is the transport that does. A host that wants the raw result
holds the port and writes its own transport, which is the same seam every framework binding uses.

**Status** — `declined`.

### `TOOL_BUSY` — a refusal word for a control that is working

**Ask.** When a control is busy, refuse the fire with a `TOOL_BUSY` reason so the agent knows why it
was turned away.

**Evidence.** Real: the wave that produced `busy` started with an agent re-firing a working control,
and a refusal is the loudest way to stop that.

**Declined, and why.** **Busy does not refuse anything.** It is what the app *said*, not a door the
app *shut*, and a library that turns a reported state into a gate has invented a rule the app never
declared — the control would stop working for the app's own UI reasons at a moment the app chose to
narrate. An app that means *and nobody may press it* already has the wire: disable the control, and
the fire is refused as `TOOL_DISABLED` exactly as before.

The second reason is structural. `FireResult.reason` and `GapRecord.rejectionReason` grow in
**lockstep** (`src/atom/types.ts`), so a word minted for the wire also lands in the triage ledger as
a refusal class an app never asked for, in every export and every gap report.

**What shipped instead.** On a refusal of a control the app also called busy, the label rides as
**data** and one authored sentence rides **beside** the refusal's own — never replacing it, and
saying out loud that busy is not the cause of the refusal it sits next to. Two true things the app
said, joined by nothing this library invented.

**Status** — `declined`.

### `busyWhen` — a declarative condition for the working state

**Ask.** The `enabledWhen` shape for the third state: declare a condition, and let the library mark
the row busy when it holds.

**Evidence.** Consistency, and it is a fair point: every other fact about a control has a declarative
form.

**Declined, and why.** A condition can prove a **state**; it cannot write **prose**. `enabledWhen`
needs no words — *off* is the whole fact — but `busy` is deliberately a **label**, the app's own
words for what it is doing, because a flag would leave the meaning to whoever renders it and put the
serving layer in the business of authoring a sentence about a state only the app can describe. A
`busyWhen` could only make this library write that sentence, which is the exact conflation the
string-only shape exists to prevent.

**Status** — `declined`. The two are independent and both true at once on a Save button mid-save:
`enabledWhen` shuts the door, `busy` says what the app is doing, and neither is served as the other's
cause.

### Reading `aria-busy` (or a spinner) off the DOM

**Ask.** Have the sensor notice `aria-busy`, a spinner element, or a disabled attribute, so an app
gets the third state with no wiring at all.

**Evidence.** Real convenience, and the attribute exists precisely to mean this.

**Declined, and why.** It is the sensor's founding law, and this feature is the case it was written
for: **the DOM is a rendering of the app's state, not the state.** A component library that keeps
its busy state in a hook and renders a sibling spinner exposes no `aria-busy` at all; another sets
it on a wrapper; a third sets it and forgets to clear it. Each of those produces a
plausible-looking answer, on a row a model plans over, that is indistinguishable from a right one —
and this row's whole job is to stop a reader guessing about a control it cannot see. The same
refusal `holds` already carries, for the same reason.

**Status** — `declined`. `busy` has three wires that all begin with the app saying so, and no
element is ever consulted — pinned by a test that shouts `aria-busy` at the sensor and proves the
row stays silent.

### `done(error)` settles the transition

**Ask.** Let closing a work row with an error mark the fire it belongs to as failed — one call
instead of two.

**Evidence.** Sympathetic: an app that opens a work row for a fire and then hits an error has said
everything it needs to say, and writing the failure twice looks like boilerplate.

**Declined, and why.** It would fork **first-settlement-wins**. Two independent things would be
racing to write one receipt, and the app's note about its own **bookkeeping** could arrive first and
*become* the library's verdict on the **action** — a settlement minted by a ledger call rather than
by the doors that mean it. The failure spine stays exactly the three doors it has always been: throw
from the handler, return `{ ok: false }`, or call `session.reject(transitionId)`. `done(error)`
records the app's error object on the **work row only**, and it is deliberately served through no
door that answers *how did this fire come to rest*.

**Status** — `declined`, and it is the load-bearing refusal of the whole work ledger. It was
re-proposed as the second tier of the React hook — *let the falling edge settle it* — and declined
again there for the same reason. `useWorking` (shipped, below) drives the work ledger and the busy
label only: the session type it accepts carries two methods, neither of which can settle anything,
so the refusal is a shape rather than a rule somebody has to remember.

---

## Shipped

Kept as worked examples of the format, and as the record of how each release was decided.

### `fire()` reports settlement truth

**Ask.** Make `fire()` say what is actually known when it returns, and hand over something that
resolves with the rest.

**Evidence.** 0.3.0 returned `settlement: 'settled'` before the deferred handler had run — the
word said *finished* about work that had not started.

**Workaround.** A `setTimeout`/poll wrapper around every fire. Cost: a timing constant per
action, guessed, and wrong on a slow backend **in the direction of reporting success**.

**Status** — `shipped in 0.4.0`. `FireResult.effectStatus` is the invocation axis at return
time (structurally never `'performed'` there); `whenSettled` resolves once with the final truth
and never rejects.

### A handler that fails by RETURNING counts as a failure

**Ask.** Treat `{ ok: false, error }` — the failure vocabulary this library itself speaks — as
a failure when a handler returns it.

**Evidence.** It was recorded as a **successful** transition carrying its own failure object as
planner-visible `produced` data. The model read a failure as a result.

**Workaround.** A throw-adapter wrapping every handler to re-throw returned failures. Cost:
every handler wrapped, and an app whose own convention is returning failures had to speak a
second convention at our door.

**Status** — `shipped in 0.4.0`. The test is deliberately narrow — own property, strict
`=== false` — so a `fetch` Response, whose `ok` is a prototype getter, stays data
(`src/traverse/handler-result.ts`).

### Per-action input contracts, advertised and enforced

**Ask.** Tell a caller what an action expects **before** it fires, and enforce the contract the
graph already declares.

**Evidence.** A `do_action` caller could only learn an action's shape by guessing wrong once,
and a declared plain JSON Schema was never enforced: an action declaring `{ value: string }`
accepted `{ name: 'add milk' }` and the handler destructured `undefined`.

**Workaround.** A hand-maintained copy of every action's input shape, beside the graph that
already declared it. Cost: N shapes to keep in sync, drifting silently, surfacing as a handler
reading `undefined`.

**Status** — `shipped in 0.4.0`. `expects` rides every served action row; `checkPayloadShape`
enforces the structural subset a planner actually gets wrong and declines to judge the rest;
refusals are built from key names and type names only, so a payload value never enters a string
bound for the model.

### Pages from a route table, and a room with no doors that names itself

**Ask.** Grow the page spine from the route table the app already owns, instead of re-typing it.

**Evidence.** A route table contributed 28 pages and **zero actions**, so an agent standing on
a wizard page truthfully answered that there was no action that would take it to the Projects
list — and looped.

**Workaround.** Three hand-written navigation tools attached to all 28 pages. Cost: a second
copy of the router, which drifts the moment either side is edited — and the agent's loop was
invisible until somebody read the transcript.

**Status** — `shipped in 0.5.0 / 0.6.0`. `fromRoutes(table)` seeds the spine (0.5.0);
`crossLinks: true` turns each page into the one action a route can honestly describe — *go to
this address* (0.6.0); and a `kind: 'dead-end'` gap row is recorded when the cursor comes to
rest somewhere every served action would refuse, **without anyone having to fire for the trap
to exist**. A closed guard is not a missing door, and is not recorded as one.

### Settled truth over the Mode B wire

**Ask.** Let a remote agent learn how a fire came to rest. `whenSettled` is a promise, and a
promise cannot cross a tool boundary.

**Evidence.** The relay written to carry it across waited on a transition listener with a
four-second ceiling and then rewrote the result with whatever it had — so a mistyped
`transitionId` produced a confident lie.

**Workaround.** That relay. Cost: a waiting listener per call, a ceiling that decided the
*answer* and not just the *wait*, and a wrong id answered with a guess instead of a refusal.

**Status** — `shipped in 0.6.0`. `settlementOf` / `settlementIfKnown` in process,
`port.whenSettled` for a caller holding only the port, and a `did_it_work` tool that **polls**
in three arms — settled, still-pending, or unknown-refused-by-name, listing the fires that are
live. The MCP boundary keeps a ceiling (`settleWithinMs`, default 250) that decides how long to
wait and never what the answer is.

### `groundTruth()` — the block that outranks the conversation

**Ask.** Give the model something from the app that it is told outranks its own earlier prose.

**Evidence.** With nothing to check itself against, a model narrated an entire flow — *name
set, recipe selected* — having called **zero** tools. Its own sentences had become its context,
and on the next turn it read them as history.

**Workaround.** None existed, and the friendly narrative beside it could not have served as
one: a refused fire is a gap-ledger row, not a transition, so a narrative built from
transitions can never show a failed attempt. Cost: the failure was invisible until a person
read the transcript.

**Status** — `shipped in 0.6.0`. `session.groundTruth()` merges both ledgers under a header
that states the ranking outright, and it rides every Mode B `whats_here` result as `facts`.
Nothing is rounded up: only a committed fire whose declared effect was observed earns *DID
happen*.

### Provable human approval

**Ask.** Make *Approve* something the library can prove, rather than something the agent can
claim.

**Evidence.** `fire('p.submit', { source: 'agent', confirm: true })` executed with an **empty**
confirm journal. `confirm: true` was the agent asserting that approval had happened — a boolean
in the model's own tool arguments, tied to no recorded decision — so a model that skipped the
ask was indistinguishable from one that got a yes.

**Workaround.** Trusting that boolean, or running an approval flow outside the library whose
*yes* the library could not see. Cost: an audit trail that cannot answer the only question an
audit asks.

**Status** — `shipped in 0.7.0`, opt-in. `requireHumanApproval` refuses a high-effect agent
fire unless it carries an `askId` pointing at a journal row a human-side door recorded;
`approveAsk` / `declineAsk` / `alwaysApprove` each stamp `principal: 'user'` with **no argument
to override it**. `confirm` is deliberately absent from `FireOptions` and will stay absent.

### `redactedFields` — hiding a field inside the data

**Ask.** Let an app keep a named field out of what the library records and shows.

**Evidence.** `redactedKeys` was consulted for **state keys** and nowhere else, and the library
said so in its own voice. So the data a transition carries rode out untouched: a handler's
return reached the model through `producedFor()`, the settlement and the wire; the record's
`payload` reached every export door; and 0.7.0's `willUse.input` put a fire's input on the
receipts a model relays. It matters more the moment an app returns real data through a handler
— which is exactly what the declined data pillar was proposing to encourage.

**Workaround.** Redacting by hand before returning from a handler and before firing. Cost: the
policy lives at N call sites instead of one, and a missed site is silent.

**Status** — `shipped in 0.8.0`. `createSession({ redactedFields: { payload,
produced } })`, dot paths in footprintjs's own `RedactionPolicy.fields` grammar, aimed per
channel on purpose. A marker (`'[REDACTED]'`), never a drop — a dropped field reads as one that
was never sent. The consent gate is untouched and that is tested: it compares the fire against
the bound input, never against the rendered receipts. **0.9.0 added a fourth point** to the
`payload` list — what a control *holds* is that same value one turn early (see below).

### A pause an agent can tell apart from a failure

**Ask.** Make a `needs-confirm` result say that nothing was done, and let an agent holding the
`askId` ask whether the human has answered.

**Evidence.** An agent hit the gate, read `ok: false` as *the app broke*, told the person so, and
went looking for another route. Nothing had happened and nothing was wrong. `ok: false` is true of
the **call**, and the payload said neither of the two things a reader needed: that nothing was
done, and that the missing piece is a person rather than a fix. The follow-up question had no
answer either — an ask is not a fire, so the id was refused `UNKNOWN_TRANSITION` beside two lists
that structurally could not contain it.

**Workaround.** Prompt engineering: a sentence in the system prompt telling the model that
`needs-confirm` is not an error. Cost: it is instruction, not data — nothing a consumer can branch
on, and it competes with everything else in the window at exactly the moment the model has decided
something went wrong.

**Status** — `shipped in 0.9.0`, **reshaped**. `performed: false` plus one authored sentence on
all three needs-confirm arms; `did_it_work` accepts an `askId` and answers `'awaiting-human'` /
`'approved-not-yet-done'` / `'declined'`, forwarding to the authorized fire once a yes is spent;
`session.asks()` is the ask book; the unknown arm grew a third list, `awaitingHuman`. The
reshaping: the obvious move was a new `'awaiting'` value on `EffectStatus` or `Settlement`, and it
was refused — nothing fired, so there is no transition and nothing that came to rest, and a word
for *no transition exists* inside the vocabulary for *how a transition came to rest* is a category
error the type would teach to everyone. It is a result-level `judgment` string instead, and no
published union grew. The tool schema did not grow either: one property carries both id families,
because a second argument changes the tool array's bytes for every caller.

### Tell the agent where an action goes — and whether it got there

**Ask.** Put the declared destination on the agent's action row, and say afterwards whether the
navigation actually happened.

**Evidence.** A navigating action declares no `writes`, so success and failure look identical from
the side of the control that was fired — nothing changed. The human had the missing fact already:
`ConfirmWillDo.navigatesTo` has ridden the approval receipt since 0.3.0. The agent's row did not
carry it, so a working link read as a dead one.

**Workaround.** Re-reading `whats_here` after every fire and diffing `youAreOn` by hand — which
answers *where am I now*, not *did that action take me there*, and cannot tell a claim from an
observation at all.

**Status** — `shipped in 0.9.0`, half of it **reshaped**. The disclosure shipped as asked:
`AvailableEdge.navigatesTo` / `goesTo` on the wire, absent when the app declared none, never
inferred. The second half did not: `arrival` reports **corroboration, not a verdict** — `'claimed'`
and `'observed'`, and deliberately no third value for *did not arrive*. A sync somewhere else, or
no sync at all, leaves `'claimed'` standing forever, because a later legitimate hop and a failed
navigation are indistinguishable from here, a session with no sync channel observes nothing by
construction, and a clock is not evidence. `'observed'` is not proof of cause either: the sync row
that produced it still carries `unverifiedEdge: true`. Corroboration needs one line from the app —
`session.sync(matchRoute(graph.spec.pages, location.pathname) ?? location.pathname)`.

### Show the model what the control is already holding

**Ask.** Put the app's current value for a control on the served row, so the model stops asking a
person to retype what they can see.

**Evidence.** A model could see that an action takes a value, and could see the app's committed
state, and could not see the draft in the box. So it asked the human to retype it, or it invented
one and fired.

**Workaround.** Pushing the draft into projected state under a state key and telling the model to
read it there. Cost: a second copy of every in-progress value on a surface built for *committed*
state, updated on every keystroke or stale — and guard evaluation reads that same state, so a
draft key is one authoring mistake away from opening an edge.

**Status** — `shipped in 0.9.0`, **reshaped**. `AvailableEdge.holds` / `holds` on the wire, from
two wires that both require the app to declare a **reader**: `registerToolGroup(…, { holds })`, and
the human sensor forwarding the `value()` getter a declared control already has. The reshaping is
the whole design: it is a **reading, not a binding** (the fire still reads its own payload at act
time), it is read **late** rather than cached, and **absence is the default** — no reader, a reader
answering `undefined`, a reader that throws, an author's `input: 'none'`, or a row standing for
every card of a `repeats` container each serve **no key at all**. There is no fallback to the app's
state and nothing is ever read off the DOM: the 0.8.0 rule that a plausible wrong value is the
worst thing this library can ship applies here more, not less, because this row is read *before*
anything fires. And it is governed by `redactedFields.payload` (redaction point 4 of 4) — what a
control holds is the next fire's payload one turn early.

### Keep a live action store current across navigation

**Ask.** Re-read a live action store when the page changes, and say something when a read fails.

**Evidence.** A store whose actions are derived from the router has no change of its own to
announce when the route moves — the store's state did not change, so nothing emits. The surface
after a navigation was therefore the **previous page's actions**, served as the actions available
here.

**Workaround.** Poking the store to emit on every route change from the app's own router
subscription. Cost: a second router subscription whose only job is to lie to the store about a
change, in every app that has this shape — and it does nothing about a read that throws.

**Status** — `shipped in 0.9.0`, plus a disclosure nobody asked for. `fromLiveStore` re-reads on
every page change the app **reports** through `sync()` (`LiveBindingPort.whenPageChanges`,
optional and severable; `Session.whenPageChanges` directly). Three edges are the reshaping: only an
**observed** page change re-reads — never a claimed one, where the app's handler has not run and a
read would describe the page it has not left; a re-read that changes nothing is free (the identity
ledger re-registers nothing); and **nothing re-reads at report time**, because a read must never
mutate the structure it is about to serve. The addition: a failed later read still warns rather
than throws, and now also files **one gap row per failure streak** with an authored `request`
naming the consequence — the bindings on offer are from before the failure, and serving them in
silence is the same confident staleness the re-read exists to end. `GapReason` did not grow for it
(`reason: 'other'`).

### Say when a control is switched off — before the agent fires it

**Ask.** Put the greyed-button fact on the row a model reads, and make the refusal say something a
caller can act on.

**Evidence.** The library had held *disabled* since 0.5 and served it to in-process callers only, so
over the wire an agent could learn it exactly one way: by firing. What came back was a bare typed
refusal — `TOOL_DISABLED`, and nothing else — and a relay filled the hole itself. It told its human
*"a required field is probably empty"*, which nothing in the app had ever said, and tried again.

**Workaround.** Exactly that: an invented explanation, plus a retry loop. Cost: a fabricated
diagnosis presented to a person as the app's own, and repeated fires against a control that was never
going to accept one.

**Status** — `shipped in 0.10.0`. `enabled: false` on the `whats_here` action row, from all four
wires that can say it (registration, the group handle, a live store row, a declared `enabledWhen`),
**presence-only** — a clickable control carries no key, because `enabled: true` on some rows would
make its absence on the rest read as *nobody knows*. The refusal gained `retriable: true` (a state
can change) and one authored constant that names what IS true, says out loud what is **not** known,
and refuses to supply a cause: *"That is a STATE, not a verdict… nothing here knows what would change
it. Do not invent a reason it is off."* No wire in this library can say **why** a control is off, so
no sentence pretends to.

### Say when a control is working right now

**Ask.** Tell the agent a control is mid-flight, so it stops re-firing it.

**Evidence.** An agent poked a working control in a loop. The app had put the button into its saving
state exactly as it does for a person; the served row had no word for that; so the one reader who
cannot see a spinner met a mid-flight control the way it meets a broken one and did the two things
you do about broken — fire it again, then tell the human it failed.

**Workaround.** Disable the control while it works, which the app was already doing anyway. Cost:
*working* and *switched off for any other reason* arrive as the same fact, so a reader cannot tell a
two-second wait from a permanent block — and the refusal carries nothing to wait on.

**Status** — `shipped in 0.10.0`, **as a label**. `AvailableEdge.busy` / `busy` on the wire carries
the app's own words (`'Saving your draft…'`) through the same three wires `enabled` has:
registration, `handle.setBusy`, and a live store's `LiveAction.busy`. Four refusals are the shape: no
boolean form (a flag would leave this library to author the meaning), no `busyWhen`, no `TOOL_BUSY`
and no gate (busy is what the app *said*, not a door it *shut*), and nothing read off the DOM. And no
timer, ever: a busy that outlives anyone's patience is answered by the row still saying busy and
`did_it_work` still saying `still-pending` — the ceiling belongs to the caller, and a caller who
stops waiting reports **unfinished**. Presence-only, so an app that never wires it says nothing about
any of its controls rather than a cheerful *not busy* about all of them.
→ [When a control is busy](https://footprintjs.github.io/hcifootprint/docs/serve/when-a-control-is-busy)

### Say the app is still working after the fire has settled

**Ask.** A way to say *this is still running* about a fire that has already come to rest.

**Evidence.** A fire settles when the app reports its delta, and the app may keep working long after
— the upload continues, the job runs on, the save's spinner outlives its receipt. Every *what is
still live?* door answered **nothing** about that window: `pending()` had settled the record, the
settlement latch had been dropped, and the ask book was never about fires. So a model polled
`did_it_work` one call later, got a settled receipt, and told the person it was done about work that
was still running.

**Workaround.** Push the flag into projected state (`saving: true`) and hope the model reads it.
Cost: a second copy of in-flight state on a surface built for **committed** state — and guards
evaluate against that same state, so a bookkeeping key is one authoring mistake away from opening or
closing an edge. It also says nothing about **which fire** it belongs to.

**Status** — `shipped in 0.10.0`. `session.beginWork(label?, { transitionId? })` hands back a
`WorkHandle`; `work.done()` closes it; `session.openWork()` is the third live door beside `pending()`
and `awaitingSettlement()`; and `did_it_work` carries `stillWorking: true` with an authored sentence
— on the `still-pending` arm and **beside** the settlement receipt exactly as `outcomeNow` does,
because a fire really can be at rest while the app really is still working. Binding is by **call
path**: the id you name, or the fire whose handler you are inside (before its first `await`), or
**unbound** at principal `'system'` with one dev warning — never a guess about which fire is which.
`done()` settles nothing, no version is bumped (bookkeeping must never make a plan stale), and no
timer closes a row: pair it like a lock, and a leak stays visible in `openWork()` rather than
decaying into a fate nobody reported.
→ [When the app is still working](https://footprintjs.github.io/hcifootprint/docs/serve/when-the-app-is-still-working)

### Wait for the app before answering the tool call

**Ask.** Let a remote caller have the settled truth in the turn it fired, rather than a receipt for
something that has not happened yet. (As **specified** it was two new `do_action` arguments — see the
declined entry above.)

**Evidence.** 0.6.0's fold closed half of this and left the other half open in a way nobody could see
from outside: it hand-patched three fields it picked out by name, so a remote agent learned strictly
**less** from a folded result than the same agent learned one poll later — no `outcome`, no
`verifyHeld`, no `writesObserved`, no `arrival`, and no marker at all on a fire nothing in the app
had executed, which reads as *it worked*.

**Workaround.** Poll `did_it_work` after every fire, or rebuild the wait outside the library — the
listener-plus-stopwatch relay of the 0.9.0 entry above. Cost: a turn per fire, or a ceiling that
decided the *answer* and not just the *wait*.

**Status** — `shipped in 0.10.0`, **reshaped**, in three parts. `port.settledAnswer(transitionId)` is
the settled truth as a **result** rather than a promise — the same builder `did_it_work` answers
from, minus that tool's envelope — and `mcpServer`'s fold spreads it whole, so one fire cannot be
described two ways. Three answers, and they are three different things: the facts for a fire at rest,
`undefined` while it is in flight, and a synchronous **throw** on an id no settlement can ever exist
for. Part two is a contract that already held and had never been written in one place — **your
handler's promise is the completion signal**: return it (`save: (payload) =>
saveDraft.mutateAsync(payload)`), throw or return `{ ok: false }` to fail, and thread
`updateState(delta, { transitionId })` when your store reports instead. Part three is the work ledger
above, for the work that outlives the fire. The wait itself stayed at the transport, and the
invariant that makes it safe is now written down: a `transitionId` is minted **only** by an executed
fire, so an awaited call is structurally incapable of blocking on a person.
→ [Waiting for the app](https://footprintjs.github.io/hcifootprint/docs/serve/waiting-for-the-app)

### A React hook that pairs the app's own async work with the ledger

**Ask, in two tiers.** One hook that opens a [work row](https://footprintjs.github.io/hcifootprint/docs/serve/when-the-app-is-still-working)
when a mutation starts and closes it when the mutation settles, so a React app never writes the
`try`/`finally` by hand — and, as tier two, let the **falling edge settle the transition too**, so
one flag could report the whole outcome.

**Evidence.** From the same wave as the work ledger itself: a component wiring `beginWork` around a
mutation writes the same shape every time, and the line that matters — `work.done()` in the
`finally` — is the one a refactor drops. A dropped `done()` is not a crash; it is a row that keeps
saying *still working* for the rest of the session. The component that would carry it already holds
every input: the busy flag its spinner reads, the words under that spinner, and the error it renders.

**Workaround.** The two lines around the work. Cost: two lines per async control, and a leak that is
**visible** rather than silent — `openWork()` keeps saying so, and `did_it_work` keeps carrying
`stillWorking`.

**Status** — **tier one `shipped in 0.10.0`, reshaped; tier two stays `declined`.**
`useWorking({ busy, label, error?, tools?, session, transitionId? })` takes the boolean the component
already has and turns its two edges into the calls the core already had: rising, one `beginWork` plus
the label on each control in `tools`; falling, `done(error)` with the error read **by presence at
fall time** (`null` is absent, as React's own data layers mean it), and the label taken back. Every
rise is its own row and StrictMode's double-invoke is one piece of work. Each field is read at its
own **edge**: the `transitionId` where the row opens, because binding is decided at call time and
never revisited — an id that arrives a commit later is refused out loud rather than dropped, and the
row keeps honestly saying *unbound*.

The tier-two half is the standing declined entry above (`done(error) settles the transition`), and
the hook is built so it cannot be smuggled back in: the session type it accepts is
`Pick<Session, 'beginWork' | 'warn'>`, a scan pins that the folder names no settlement door, and the
refusal is asserted again from the hook's own side. **The worst a wrong flag can do is say the app is
working when it is not — never that something worked.**

Two refusals came with it. **Unmount does not close the row** — a component going away is not the
work ending, so closing it would mint a verdict out of silence; the busy label *is* cleared, because
that claim's keeper has gone. What is unknown stays open, what was claimed is taken back, and one dev
warning says so. And **the core did not grow a framework**: the hook is a lifecycle over five plain
lines, `test/work-framework-interface.test.ts` drives those lines with no framework loaded, so a Vue
or Angular skin needs nothing new from the library.
→ [Waiting for the app](https://footprintjs.github.io/hcifootprint/docs/serve/waiting-for-the-app) ·
[The React binding](https://footprintjs.github.io/hcifootprint/docs/serve/react-binding)
