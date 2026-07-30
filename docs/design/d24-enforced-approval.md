# D24 — Enforced approval: a claim the library cannot prove is not an approval

Status: SHIPPED (0.6.x line, after the 0.6.0 release). Lineage: d18 (navigation graph) →
**d21 (confirm receipts)** → d22 (materialized fires) → d23 (graph sources) → **d24**.

## The finding

Reported by a production integration, then verified at source:

```
fire('p.submit', { source: 'agent', confirm: true })   // executes with confirms() EMPTY
```

`confirm: true` was the AGENT asserting that approval happened — a boolean in the model's own
tool arguments (`serve/modes.ts` `STEP_INPUT_SCHEMA`), tied to no recorded decision. A model
that skipped the ask was indistinguishable from one that got a yes. Three things made it worse
than "unenforced":

1. **On the first call the journal did not even fill in.** `confirmAsk` is reached only on the
   `args.confirm !== true` arm, so a high-effect action ran and `confirms()` stayed empty — not
   "an audit trail exists, enforcement does not", but no audit trail at all.
2. **Nothing in the repo could record a human approval.** The only writer of an `'approved'`
   row was `#resolveOpenAsk`, called from inside `fire()`, stamping the FIRING principal. The
   row named `'approved'` was minted by the very fire it claimed to authorize. There was no
   `approve` twin to `declineConfirm`, so "an askId whose row is approved by a `'user'`
   principal" was a state the library could not be in.
3. **A direct `session.fire()` ignored `confirm` entirely** — the gate was a served-boundary
   concept, defensible (the app's own code owns its session) but documented nowhere. An
   undocumented trust boundary is how audits fail.

D21 was always honest about being an OBSERVATION: *"a successful fire() auto-closes any open ask
as 'approved' … This is automatic."* This record does not correct D21. It builds the missing half
of the chain and then makes a gate require it.

## The decision

`SessionOptions.requireHumanApproval` — opt-in, default absent. Under it, a high-effect AGENT
fire is refused unless it carries `FireOptions.askId`, pointing at a journal row written by a
human-side door, or a standing `alwaysApprove` grant covers it.

**Four plain words that say what the option does, naming the human act rather than the
mechanism.** Rejected: `enforceHITL` (an acronym nobody outside the field parses),
`strictConfirm` (says nothing about *who*), `confirmMustBeApproved` (circular — confirm already
reads as approve), `provenApprovalOnly` (jargon).

### Three properties, and what each one cost

**ASSERTION → REFERENCE.** `confirm` is deliberately NOT added to `FireOptions`, and will not
be: a boolean the caller controls is not evidence, so the door has no slot for one. The proof is
a pointer. The askId is guessable by construction (`ask#N`, a per-session counter already handed
to the model) and that is fine — the gate requires a ROW for that id, written by a channel the
model cannot write. It is a citation, not a capability token.

**THE APPROVAL BINDS TO THE RECEIPTS.** A human approved the action *and the input on the card*,
so `ConfirmReceipts.willUse` records what will be sent and the gate compares it at fire time.
Identity is **exact structural equality** over a canonical key-sorted rendering — never a
declared subset, because a subset rule needs the library to know which fields are consequential,
and guessing is exactly how ask-to-do-A launders into do-B in the fields nobody declared.
`same-input.ts` declines toward **REFUSE** where `payload-shape.ts` declines toward ALLOW: same
stance, opposite default, and the reason is which mistake is unrecoverable. Values the receipts
cannot hold faithfully (Map, Date, BigInt, cycles, anything past the snapshot caps) are
`'cannot-judge'` and therefore refused, because comparing two truncations would approve a fire
whose 31st item differs from the card's.

The snapshot lives on the ask row's existing `receipts`, not in a separate digest field: the gate
recomputes from `willUse`, so there is one source of truth, nothing to fall out of sync, and an
auditor holding an exported journal can recompute the same comparison. The honest cost is stated
on the page — the input now rides the receipts to the model, the human and the export.

Immutable asks close the supersede vector: under enforcement a re-ask whose normalized
`{input, instance}` differs from every open ask mints a NEW askId. Otherwise the card showing
input A could be re-pointed at input B under the same id, and the human's click would approve B.

**CONSUMPTION IN THE GATE'S OWN VOCABULARY.** One ALLOW = one fire, consumed; the spend appends
its own `'used'` row rather than mutating the `'approved'` one, because the journal is
append-only and rows are handed to listeners as deep copies at push time — and because an auditor
holding only `confirms()` must be able to count approvals against executions. ALWAYS ALLOW is a
`'always-approved'` policy row, scoped to the action (+ optional instance) and deliberately NOT
to the input; every fire under it still lands a `'used'` row, and that visible exercise count is
the auditable price of a durable grant. `revokeAlwaysApprove` ships with it, not after it: a
durable grant with no off switch is a permanent hole.

Four new KINDS rather than a `scope: 'once' | 'always'` field, because a new field is silently
ignored by a consumer that does not know it exists — so a durable grant would be counted as a
one-time yes by every 0.6-era filter, and here being missed is a security misreading.

### Where the gate sits, and why

One insertion in base `Session.fire()`, after the capability refusals and **before** the
`allowUnmaterializedFires` tour arm. `#invokeHandler` is the only thing that executes and its
four call sites are all inside `fire()`, so every port inherits the gate from the one chokepoint
— and a direct in-process `fire()` is gated too, which is what the reported surprise actually
needed. `#invokeHandler` itself would be far too late (the record is pushed, the cursor has
moved, a commit bundle may exist); `modes.ts` alone could not bind the direct door.

Before the tour arm is the non-obvious half: after it, an unapproved high-effect fire would come
back `ok: true, executed: false` with an `'unmaterialized-fire'` row — an agent could enumerate
the high-effect doors by firing them and read success-shaped results back.

### The decline is unforgeable too

A gate asymmetric in the attacker's favour is not a gate. `declineConfirm` is recorded as a REPORT
and closes nothing — otherwise a caller could manufacture a human no, or bury the pending card so
the person never sees the question. It is the door that takes a `principal` argument, so under
enforcement it honours none of them: see *"the asymmetry that was a hole"* below. A human no
arrives through `declineAsk(askId, { by })`, is terminal and permanent for that askId, and
outranks a standing grant for the thing the person was shown; a re-ask after one mints a new id,
so nagging is countable.

### Staleness: recorded always, enforced only when asked

Every enforced row carries `timestamp` and `stateVersion`. Whether a stamp DISQUALIFIES is a
product decision the library must not guess — approving a refund may legitimately take four
minutes, and `#stateVersion` moves on nearly every report in a live-tapped app. So both rules
default off and a strict host can implement any policy it likes from the exported journal.
`stateVersion`, never `version`: the honest question is "did the app's state change since the
human looked?", and `version` also bumps on served-structure changes and on the fire itself.

## What this does NOT prove, stated as loudly as what it does

- **Not that a person authenticated.** `by` is a string the host supplies. The library proves a
  `'user'`-principal row of an approving kind exists for this action and this input, and has not
  been spent.
- **Not the approval channel's own integrity.** `approveAsk` is a public method on an in-process
  object; wire it where a model can reach and the gate is only as strong as that wiring. The
  sibling library gets this for free — there consent arrives as the APP's argument to
  `agent.resume(checkpoint, decision)`, a channel the model does not write — whereas `confirm`
  was a field in the model's own tool args. That one sentence is the whole finding, and the
  honest thing is to say the option moves approval onto a channel the model does not write *by a
  convention you must uphold*, not by a proof we can offer.
- **Not the app-self-report tier.** The gate keys on the PRINCIPAL: `source: 'user'`,
  `source: 'system'` and the record-only sensor (`invoke: false`) pass, because that motion really
  happened. Consequence, in the never-trap gate's own voice: hand a model a port constructed with
  `source: 'user'` and you have disarmed this gate. The library will not refuse to build that
  port — the tier is the point — but it warns when it does, and it serves that port the
  *unenforced* tool descriptions (see *"a true sentence about the wrong subject"* below).
- **Not cross-session.** Ask ids are per-session counters, so a pointer from session A cannot
  resolve in session B — not by a check, but because the journal is per-session. An audit sink
  must key on `(session, askId)`.
- **Not tier-2 inference.** `updateState()` can still record a `cause.kind:'fired'` row for a
  high-effect action with `principal: 'unknown', inferred: true` — the app reporting motion the
  library did not perform. Reconciliation must special-case `cause.inferred`.
- **Not the app calling its own handler function.** A `ToolRegistry` handler reference is outside
  the library's reach entirely.

## Round two — what a reviewer trying to FORGE an approval found

The first round was reviewed by reading. The second was reviewed by attacking: A1–A20, B1–B12 and
C1–C5, run against a built `dist`. Sixteen were refused. Four were not, and each one is a
different way of holding the same mistake — **treating a claim as a fact.** Every fix has a test
named after its attack.

**A8/B2 — a comparison against yourself is a ceremony.** The ask stored the CALLER'S OBJECT as the
binding target. `#willUse` snapshotted for the card, so the human saw `{ total: 10 }` frozen
forever, but `checkApproval` compared the fire's payload against that same live reference: mutate
it after the yes and both sides are one object, verdict `'same'`, ALLOW. The card said 10, the
order went out for 999999, and the journal read *ask → approved → used* with nothing wrong in it.
The ask now binds a detached copy (`bound-input.ts`). It does NOT fall back to the reference when
the copy fails: a `Proxy` over a plain object renders faithfully through `sameInput` and throws
`DataCloneError` — precisely the shape built to lie about itself — so an uncopyable value binds to
a symbol stand-in that can never match. It does not bind the receipts snapshot either: that one is
capped for display, and binding to a truncation would approve a fire whose 31st item differs from
the card's.

**C4 — a true sentence about the wrong subject.** `CONFIRM_DESCRIPTION_ENFORCED` ("a step with no
approval on record is refused") was served whenever the SESSION enforced. But the gate keys on the
principal, so a port built with `source: 'user'` — the documented, deliberate exemption — was the
one port whose fires were never held, and the one telling a model in the library's own voice that
they were. The exemption is unchanged. The claim is not: `Session.requiresHumanApprovalFrom(principal)`
is the honest question for a port, a disarmed port serves the unenforced descriptions, and building
one warns through the host's own `onWarn`. Documented is not the same as told, and the runtime
must not contradict the page.

**B7 — the asymmetry that was a hole.** `approveAsk` deliberately has no `principal` argument.
`declineConfirm` had one, and the first round justified that as safe because "a decline never
authorizes". It does two other things: it writes a human decision into the auditable journal, and
it takes the question off the person's screen. Passing `principal: 'user'` did both. So under
enforcement that door now records a report whatever it is handed, marked `relayed` on the row so
an auditor never has to infer it from a principal the caller chose.

**A19 — a no you can walk around by dropping the pointer.** The decline was read off
`openAsks.get(askId)` — only when the caller PRESENTED the id that would refuse it — and the
standing-grant check ran first. Omit the pointer and the grant outranked the person's Decline,
which made the comment above it ("a human no outranks every other authority") false on a security
boundary. The gate now asks the ask BOOK, scoped to the action, instance and input the person was
actually shown; an input it cannot judge stays covered. Scoped, not blanket: a grant is
deliberately not input-bound, so a genuinely different order is still authorized by the yes the
human also gave. Both halves are now true of the code.

Two more, smaller and worth naming. **F5:** the port passed the model's `input` to `confirmAsk`
unconditionally, so a consumer who upgraded and enabled nothing started finding `willUse` — user
payloads — in every served ask and in the exported journal. "Byte-identical" is a claim about the
path consumers use, and the file that guarded it asked with no input at all. **C2:** every open
ask wrote a line into `groundTruth()`, the block a model is told to trust above its own account,
and under enforcement a model can mint asks at will; the awaiting lines are now capped by the same
dial as the attempts list, oldest kept, count stated.

The pattern under all six: the library was reporting something it had not established. That is the
same defect as the original finding, wearing different clothes each time.

## Round three — a whole-wave pass over the finished tree

Forty-three attacks re-run against the FINAL tree by someone not trusting round two, plus a 0.6
consumer compiled and run against the published 0.6.0 and against this build and diffed. Every
forgery round two closed stayed closed. Three things came back.

**The docs site would not build.** One frontmatter line — `description:` carrying an unquoted
`` `confirm: true` `` — and YAML reads the colon-space inside a plain scalar as a nested mapping,
which kills the whole Fumadocs build. `npm run docs:links` had said *"✓ all internal links
resolve"* over exactly that tree, because it never parses frontmatter as YAML. A green gate over a
site that does not exist is the same defect as the original finding, so the value is quoted and
`test/docs/frontmatter.test.ts` now states the one rule that bit.

**"Byte-identical" was one field too strong.** Confirm-journal rows moved from `Date.now()` to the
session's injected `now()` in this wave, which is the right behaviour — a session handed a clock
should use it — and it is not identical. A 0.6 consumer that injects `now` and asserts on
`confirms()[n].timestamp` sees its own clock where it used to see the wall. Everything else the
consumer touched — the served tool schema byte for byte, `whats_here`, the whole ask →
`confirm: true` → `approved` chain, transitions, gaps, `groundTruth()`, warnings — is identical.
The claim is corrected rather than the behaviour reverted.

**A payload that answers differently each time it is read.** `bound-input.ts` detaches the ASK's
input so a caller cannot swap it after the yes. The FIRE's payload is not detached: the gate reads
it, `#invokeHandler` reads it again on the next microtask, from the same object. A plain value
cannot change in between — a getter can. Hand `fire()` an object whose property returns the
approved `10` to the gate and `999999` to the handler, and the gate allows it, the handler receives
`999999`, and the journal reads ask (`willUse.input: {total:10}`) → approved → used with nothing
wrong in it. The same works through an array element.

It is NOT a hole a model can reach: nothing crossing a JSON boundary — the Mode B port, the MCP
server — can carry a getter, and the exhibit needs `Object.defineProperty` in the host's own
process. That places it in the same tier as *"if you wire `approveAsk` somewhere a model can
reach"*: your own code, your own side of the channel. So it is written into **What this does NOT
prove** rather than papered over, and the honest cure is one line at the call site — relay a plain
snapshot, not a live object.

Closing it in code would mean the gate comparing a snapshot and the handler receiving THAT
snapshot, which changes what every enforced handler is handed (identity, and payloads that do not
survive a copy). That is a design decision about the handler contract, not a review fix, and it is
recorded here rather than taken.

## The line this record exists to make true

Without the option: *Approve is a recorded decision plus a convenience message — honest for a
demo, but I wouldn't describe it as enforced HITL.*

With it: *a confirmed fire carries a pointer to a decision a person recorded, and the library
refuses anything it cannot prove.*
