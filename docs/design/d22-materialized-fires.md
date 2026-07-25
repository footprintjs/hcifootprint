# D22 — NOT_MATERIALIZED: unbound fires die loudly, tours tell the truth

**Status: SHIPPED 2026-07-25.** Closes the last place the driver could hand an
agent a success it had not earned. Library suite 323/323 green; typecheck clean;
one deliberate behavior change (pre-1.0 minor).

---

## 1. The bug, as reported

An external tester driving a live Bedrock agent through Mode B in **guide mode**
(a session wired with `sync()`/`updateState()` and *no* `registerToolGroup`):

```ts
const session = graph.createSession({ node: 'catalog' });   // nothing bound
skillsAsTools(session).call('shop.do_action', { action: 'go-checkout' });
// → { ok: true, did: 'catalog.go-checkout', settlement: 'settled', transitionId }
```

The model read that as success and told the human *"Successfully created the
project…"*. Nothing had executed. Two distinct failures:

1. **Success-shaped no-op.** `fireData()` returned no `executed`/`materialized`
   marker; `materialized` lived only on the availability channel
   (`available()`), which an *acting* agent never re-reads. `settlement:
   'settled'` means "no declared writes are pending" — to a model it reads
   "it worked".
2. **Cursor divergence on a claim.** A `goTo` edge moved the live cursor at
   settle time (`toNodeClaimed = true` on the record) but nothing on the Mode B
   result said so, so the library's position could drift from the real app with
   no signal — including for *bound* handlers, since a handler completing does
   not confirm navigation either.

The README already stated the rule ("never `fire()` an unregistered tool") — the
library did not enforce it.

## 2. The stance

The same honesty calculus the library applies to reads (`guardUnevaluated`), to
effects (`effectVerified`), and to presence (`activation: 'assumed'`), now
applied to **actuation**: never launder a claim as a fact. Fail closed by
default; when a consumer knowingly wants the claim, say plainly that it is one.

## 3. The gate, and why it is gated on `source === 'agent'`

One chokepoint: `Session.fire()`, inserted **after** the `TOOL_DISABLED` gate and
**before** the record is created — last in the taxonomy, so a greyed tool still
answers `TOOL_DISABLED` and a mid-mount node still answers the retriable
`STILL_MOUNTING` (NavSession checks that in the subclass, before `super.fire`).

```ts
const unmaterialized =
  opts.invoke !== false && this.handlerFor(affordanceId, opts) === undefined;
```

- For an **agent**, `#invokeHandler` is the only way anything real happens. No
  handler + `invoke !== false` ⇒ provably nothing executes, in all three fire
  arms — including the tapped arm, whose pending would otherwise hang forever.
- **`source: 'user' | 'system'`** is the documented flat tier: the app
  *self-reporting* motion its own code performed (`fire(id, {source:'user'})`
  then `updateState(...)`). That is real, executed motion with no registry.
  Gating it would break the whole pre-registry rung, `registerTools` triggers,
  and `hcifootprint/testing`'s `user.fire`. Untouched.
- **`invoke: false`** is record-only by declared contract (the DOM sensor, or an
  external actuator that already performed the action). The world executed it.
  Untouched.
- Instance-keyed bindings are honored for free: the check calls the **virtual**
  `handlerFor(affordanceId, opts)`, which `InteractionSession` overrides.

Because the gate sits in the rejection chain of the one driver, **every port
inherits it**: Mode B, the MCP server, direct `fire()`, and the test harness.

## 4. The opt-in lives on the SESSION, not the port

`allowUnmaterializedFires` is a `SessionOptions` field (`createSession`), not a
`skillsAsTools` option:

- Guide mode is a property of the session's **wiring**; the party calling
  `createSession` is the one who knows nothing is bound. Letting a per-conversation
  port widen execution semantics beyond the session owner's declaration would
  invert the trust order.
- Enforcement lives in `Session.fire()`, so the option must live where the
  enforcer lives — a `skillsAsTools` option could not protect direct `fire()`
  callers, Mode A, or the harness.
- `InteractionSessionOptions extends Omit<SessionOptions, 'node'>`, so the tree
  API inherits it with zero extra code.

The name keeps the repo's own marker vocabulary: `materialized` is already
public API on `AvailableEdge` and in the honesty-marker table.

## 5. What a permitted no-op says

| surface | marker |
|---|---|
| `FireResult` (ok arm) | `executed: false`, `materialized: false` — present ONLY on this path |
| `TransitionRecord` | `materialized: false` — every effect on this row is a claim |
| gap ledger | a row of the new `kind: 'unmaterialized-fire'` — not `fire-rejected` (nothing was refused), not `reported` (nobody reported): the binding to build |
| `contextBrief()` | `[not materialized — nothing executed]` on the line |
| `available()` / Mode B | `materialized: false` on every served edge, `readySteps`, and `whats_here` action — visible BEFORE the fire |

A permitted no-op also **never joins the pending queue**, even in a session with
a state tap and a declared-writes edge. Nothing ran, so no report is coming for
it: it settles at once with `effectVerified: 'unobservable'`. Letting it pend
would re-create the exact laundering this design exists to kill — the record
would sit `awaiting-state` forever, and the next *real* delta the human causes
would settle the agent's phantom by FIFO, stamping `effectVerified: true` on a
row that also carries `materialized: false`. A record must never certify that
nothing verifiably caused something.

`materialized: false` is the *static* fact (no binding existed at fire time,
mirroring the availability marker); `executed: false` is *this fire ran nothing*.
They coincide today but are kept separate so a future partially-executing path
can diverge them. Mode B fires one step per call, so per-fire markers already
cover a partially-bound skill (step A bound → plain success; step B unbound →
rejection, or a marked no-op).

## 6. Claimed navigation, disclosed

`fireData` now surfaces `toNodeClaimed: true` on **every** settled fire whose
cursor moved on the declared `goTo` — bound handlers included. Paired with the
documented consumer rule: **re-`sync()` after any claimed navigation.** On
`settlement: 'awaiting-state'` the settle has not happened at result-build time,
so there is nothing to disclose yet; the existing settlement re-read rule covers
that turn.

## 7. Not built (deliberately)

- No `retriable` on `NOT_MATERIALIZED` — unlike `STILL_MOUNTING`, nothing is
  expected to arrive (mid-mount arrivals are already answered upstream).
- No tool-schema or tool-description changes: the static Mode B tool array stays
  byte-identical (the prompt-cache invariant). Everything rides the result channel.
- Confirm receipts do not yet disclose `materialized: false` on an unbound
  high-effect ask — noted as a follow-up.
