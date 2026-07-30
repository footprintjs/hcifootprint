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

A gate asymmetric in the attacker's favour is not a gate. An agent-relayed `decline: true`
(principal `'agent'`) is recorded as a REPORT and closes nothing — otherwise an agent could
manufacture a human no, or bury the pending card so the person never sees the question. A human
no is terminal and permanent for its askId; a re-ask after one mints a new id, so nagging is
countable.

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
  `source: 'user'` and you have disarmed this gate.
- **Not cross-session.** Ask ids are per-session counters, so a pointer from session A cannot
  resolve in session B — not by a check, but because the journal is per-session. An audit sink
  must key on `(session, askId)`.
- **Not tier-2 inference.** `updateState()` can still record a `cause.kind:'fired'` row for a
  high-effect action with `principal: 'unknown', inferred: true` — the app reporting motion the
  library did not perform. Reconciliation must special-case `cause.inferred`.
- **Not the app calling its own handler function.** A `ToolRegistry` handler reference is outside
  the library's reach entirely.

## The line this record exists to make true

Without the option: *Approve is a recorded decision plus a convenience message — honest for a
demo, but I wouldn't describe it as enforced HITL.*

With it: *a confirmed fire carries a pointer to a decision a person recorded, and the library
refuses anything it cannot prove.*
