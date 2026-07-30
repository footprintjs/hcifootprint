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

**Status** — `shipped on main, unreleased`. `createSession({ redactedFields: { payload,
produced } })`, dot paths in footprintjs's own `RedactionPolicy.fields` grammar, aimed per
channel on purpose. A marker (`'[REDACTED]'`), never a drop — a dropped field reads as one that
was never sent. The consent gate is untouched and that is tested: it compares the fire against
the bound input, never against the rendered receipts.
