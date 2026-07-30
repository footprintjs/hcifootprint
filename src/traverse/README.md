# traverse — the driver (layer 2)

**Job:** the `traverse()` counterpart to footprintjs's `run()`. A `Session` is a traversal moved **one edge at a time from outside** — `fire()` (agent), wrapped triggers / the future DOM sensor (user), `sync()` (world) — all into ONE footprint commit log with provenance.

**Depends on:** `atom/`, `registry/`, `serve/`, and footprintjs's memory/commit/trace machinery (deliberately NOT its executor).

The commit discipline that makes footprint's toolchain work unchanged on UI sessions:

```
one settled transition → one fresh StageContext (runId '')
  → tracked reads (guard keys) + tracked writes (the settled delta)
  → commit() → one CommitBundle
```

so `causalChain` / `sliceForKey` / `arrayProvenance` answer "why is the app in this state?" with zero new query code (`session.why(key)`).

Also lives here: CAS on `cursorVersion` + guard re-evaluation at fire time · settlement/attribution (transitionId-precise > explicit-stimulus > FIFO) · tier-2 effect-signature inference (exactly-one match, `inferred` flag) · skill frames (commit/leave/demote, derived dependency DAG) · `contextBrief()` (the traverse-path delta, authored strings only).

Longevity rules (from the footprint execution-model adjudication): fresh context per transition (never `createNext`), `runId` stays `''`, monotonic `runtimeStageId` counter.

## settlement.ts + handler-result.ts — "was it actually done?"

`fire()` is synchronous, but the handler it invokes is always deferred, so the
result carries **two** answers: `effectStatus` (what is known at return time —
never `'performed'`, by construction) and `whenSettled` (a promise resolved
ONCE with the final truth, which never rejects; refusals arrive as data).

`settlement.ts` is that promise's machinery — one latch per fired record, first
settlement wins. `handler-result.ts` holds the one narrow test that decides
whether a handler's return value is a REFUSAL (`{ok:false}` — routed exactly
like a throw) or DATA (kept as `produced`).

Kept deliberately apart: `effectStatus` is the INVOCATION axis (did our side
run?) while `TransitionRecord.effectVerified` is the STATE axis (were the
declared writes observed?). They disagree honestly — a tapless handler
completes `'performed'` with `effectVerified: 'unobservable'` — and neither is
averaged into the other.

## approval-gate.ts + same-input.ts — an approval we cannot prove is not an approval

`confirm: true` was the AGENT asserting that a human approved: a boolean in the
model's own tool arguments, tied to no recorded decision, so a model that never
asked was indistinguishable from one that got a yes. Worse, nothing in the
library could RECORD a human approval — the only writer of an `'approved'` row
was `fire()` itself, stamping the firing principal on the row that claimed to
authorize it.

`SessionOptions.requireHumanApproval` (opt-in, absent by default) closes it in
two halves. The missing half first: `approveAsk` / `declineAsk` /
`alwaysApprove` / `revokeAlwaysApprove` are human-side doors that stamp
`principal: 'user'` with **no argument to override it**, and require `by`. Then
the gate — one insertion in base `fire()`, after the capability refusals and
before the tour arm, keyed on the PRINCIPAL rather than the door, so a direct
in-process agent fire is gated while the app-self-report tier is not.

`approval-gate.ts` is a PURE function taking the open asks, a row lookup, the
standing grants, the clock and the policy — no `Session` import — because the
verdict has ten branches and every one is something somebody will try; testing
it without a session is what makes each mutation proof three lines.

`same-input.ts` answers "is this the input the human was shown?" and is the one
module in the library that declines toward **REFUSE**: `payload-shape.ts` passes
what it cannot judge because a wrong rejection has no appeal, while an
unprovable match on a security boundary is not a match. Same stance, opposite
default; the reason is which mistake is unrecoverable. Values the receipts
snapshot cannot hold faithfully — a `Map`, a `Date`, a cycle, anything past the
caps — are `'cannot-judge'`, and the gate refuses rather than guessing.

## payload-shape.ts — the input contract, enforced

A declared schema reached the model but not the door: `.safeParse`/`.parse`
validators ran, a plain **JSON Schema** did not — it only described the payload,
so a planner's guessed key arrived at the handler as `undefined`. This module is
the structural check that closes it, and `expects` on every served action row
(`serve/modes.ts`) is the other half: the shape is visible BEFORE the fire, and
a wrong one comes back as `PAYLOAD_INVALID` carrying what was expected.

**Teachable, not complete** — and the name (`SessionOptions.checkPayloadShape`,
default true) says so. It judges required keys, declared primitive types, closed
objects, one level of nesting; `$ref`/`allOf`/`anyOf`/`oneOf`/`enum`/`format`/
`pattern` it DECLINES to judge and passes, and `patternProperties` stands the
closed-object rule down (it allows keys by regex, which this checker does not
evaluate). Declining is the same stance `#evalGuard` takes on an unevaluable
key: what cannot be evaluated is never reported as false, because a wrong
rejection blocks an action the app would have accepted and the caller has no
appeal.

Messages are built from KEY NAMES and TYPE NAMES only — never values — and both
the count and the length of the names shown are capped, because a received shape
renders what the CALLER sent. `issues` rides `FireResult` to the caller and into
the Mode B rejection a model reads; the gap ledger stores the rejection reason
alone, never this string.

The gate is source-blind: an agent fire, a `user`/`system` fire and the
record-only sensor fire all answer for the payload. That is where zod already
sat in 0.3.0 — a schema is the app's statement about its own door, and a fire
that disagrees with it is drift worth a ledger row whoever made it.

## Answering with a value: `trySkillPlan()`

`commitSkill()` returns `{ok:false, reason:'UNKNOWN_SKILL', known}` while
`skillPlan()` threw, so a caller holding a model-supplied id handled the same
question two ways. `trySkillPlan()` is the second door, returning that identical
failure shape; `skillPlan()` keeps throwing for the internal callers that pass
an id the spec just yielded, where an unknown one is a bug that should stop.
Membership is `Object.hasOwn` — the ids arriving here are untrusted, and
`skills['constructor']` is truthy on a plain object.

## nav-session.ts — the D18 composition layer

`InteractionSession extends Session` and is where the independent layers meet: the
authored tree (`tree/`) × the presence sensor (`presence/`) × this driver.
The fused priority stack: **router sync owns the page level → authored
semantics own meaning (modal overlay, tab prior, repeats) → mount handles own
presence below the router-confirmed page → explicit visibility signals own
shown/hidden**. Focus is set ONLY by sync()/fire() evidence, with
nearest-active-ancestor fallback (modal-close auto-resume for free).

Honesty rules: derived facts carry markers (`activation: 'assumed'`,
`presence: 'unknown'`, `enumeration: 'mounted-window'`); refused fires are
typed, retriable where true (`STILL_MOUNTING`), and always gap-ledger rows;
multi-mounted tabs serve a flagged union — never a guessed winner.

World-motion scoping (the version split): node presence/visibility flips
flush ONE microtask-coalesced `structure-swap` transition and bump
`version` + `structureVersion`; instance churn inside `repeats` containers
bumps nothing global. StrictMode/HMR mount flicker cancels to nothing.

