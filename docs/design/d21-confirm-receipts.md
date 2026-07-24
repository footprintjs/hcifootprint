# D21 — Receipts on the high-effect ask, and decisions that leave a record

**Status: SHIPPED 2026-07-24.** Extends D18's `needs-confirm` gate (`§7`,
`§8`) with an evidence pack and an auditable ask→decision→fire chain. Library
suite 299/299 green; typecheck clean; zero breaking changes to the driver.

D19 (traverse-upstream) and D20 (the observability boundary) remain backlog
candidates — this is a self-contained increment on the confirm gate, so it
takes the next free number, D21.

---

## 1. The problem

D18 shipped the confirm gate: a high-effect edge (`confirm: true`) returns
`judgment: 'needs-confirm'` and refuses to auto-cross until the caller re-fires
with `confirm: true`. Two honesty holes remained — verified against the code:

1. **The ask carried no evidence.** `modes.ts` returned only `{does, howToAct}`.
   Yet the session ALREADY holds everything needed to justify the action:
   per-condition guard evidence (`AvailableEdge.evidence` / fire-time
   `conditions`), the declared `Effect` claim, position, and the fire journal.
   An empty "are you sure?" trains a human to rubber-stamp — the opposite of
   what a high-effect gate is for.
2. **No record landed.** An ask left no trace; a decline left no trace (the host
   simply never re-called — an *invisible* event); only an approved fire wrote a
   `TransitionRecord`, and it did not link back to the ask. The `GapRecord`
   kinds (`fire-rejected` / `reported`) deliberately exclude this — a gated
   action is not unmet demand.

## 2. Receipts ride the ask

The `needs-confirm` result gains a `receipts: ConfirmReceipts`, assembled by
`Session.confirmAsk()` from live state — **a pure read, no new capture**:

```ts
interface ConfirmReceipts {
  willDo: ConfirmWillDo;          // authored description + declared, honesty-tagged effect
  because: FilterCondition[];     // the guard evidence that made this edge fireable — KNOWN, not scored
  becauseUnevaluated?: string[];  // guard keys taken on faith (absent from the state view)
  youAreOn: string;               // position, folded in → a self-contained pack
  version: number;
  recentSteps: ConfirmTrailStep[];// a compact, injection-safe tail of the fire journal
}
interface ConfirmWillDo {
  does: string;                   // the authored planner-facing string (firewall-clean)
  writes?: string[];              // a CLAIM (effect.writes), verified at settlement
  navigatesTo?: string;           // a CLAIM (effect.navigatesTo), reconciled by sync()
  effectUnverifiable?: boolean;   // declares writes but no state tap ⇒ effectVerified would be 'unobservable'
}
interface ConfirmTrailStep { what: string; principal: Principal; outcome: Settlement; }
```

Design commitments:
- **`because` is structural, not scored.** The session KNOWS why an edge is
  fireable — the guard is the literal precondition — so `because` is the actual
  passing `FilterCondition`s, never a ranked guess. This is the thesis in
  miniature: an agent *chooses and must explain a guess*; a UI session *offers
  and can cite the reason*.
- **Two-string-class safe.** `willDo.does` and the affordance ids in
  `recentSteps.what` are authored/enum source literals; state VALUES appear only
  inside `because` (the same `FilterCondition.actual`, redacted by the same
  predicate, that `available().evidence` already serves). No runtime page text
  reaches the pack.
- **Honesty up front.** `effectUnverifiable` and `becauseUnevaluated` state what
  the library itself cannot check, rather than showing the human a claim dressed
  as fact.

## 3. Decisions leave a record — a separate journal

A new **confirm journal** (`ConfirmRecord[]`), sibling to the gap ledger:

```ts
interface ConfirmRecord {
  kind: 'ask' | 'approved' | 'declined';
  askId: string;            // links the three rows of one gate
  affordanceId: string; timestamp: number; node: string; version: number; principal: Principal;
  receipts?: ConfirmReceipts;  // 'ask' rows
  transitionId?: string;       // 'approved' rows → joins the commit log
  by?: string; note?: string;  // 'approved' / 'declined' rows
}
```

**Why a separate journal, not a new `GapRecord` kind.** The gap ledger's one job
is triage — *what capability to build next* — and a needs-confirm is not a
missing capability; the capability exists and awaited consent. Folding asks into
`gaps()` would poison that signal (every high-value action would read as a gap).
So `confirms()` / `onConfirm()` mirror `gaps()` / `onGap()` exactly (deep copies,
per-listener clones, throwing-listener isolation) but stay a distinct stream.

**The chain, and where the ask lives.** The confirm gate is serve-layer POLICY
(`confirmHighEffect`), but the RECORD is session state (durable, linkable), so
the session owns it and the serve layer drives it:

- `confirmAsk(id)` lands an `'ask'` row and returns `{askId, receipts}`; one
  open ask per affordance (a second ask supersedes — the human is still
  deciding).
- A successful `fire()` auto-closes any open ask for that id as `'approved'`,
  stamping `TransitionRecord.askId` and the row's `transitionId`. This is
  automatic (no plumbing through the serve layer, and a human clicking the
  button directly closes it too) and fires only on `result.ok`.
- `declineConfirm(id)` lands a `'declined'` row and closes the ask.

## 4. The decline call — an explicit surface, chosen deliberately

Today a declined high-effect action is simply never re-called: the ask dangles
and the refusal is invisible. That contradicts the repo's spine ("never a silent
exclusion"). So decline gets an explicit surface:

- **Mode B:** a `decline: true` arg on the existing skill-tool / `do_action`
  call — symmetric with `confirm: true`. Crucially it is an ARG, **not** a new
  tool: adding `declineStep`/`declineAction` tools would break Mode B's fixed
  tool-array cache contract. It lands in the static `{step,input,confirm,decline,
  instance}` schema (a one-time pre-1.0 schema bump, like D18's).
- **Direct:** `session.declineConfirm(id, {by, note})` for any host/mode.

Backward-compatible: a host that never declines just leaves the ask open — no
crash, byte-identical firing behavior for non-high-effect edges.

## 5. agentfootprint kinship (shape-kin, substance-different)

Deliberate field kinship so a consumer wiring both libraries sees ONE mental
model — but **nothing is imported across** (hcifootprint has zero agentfootprint
dependency; this is shape-kinship only):

| agentfootprint `CheckInEvidence` | hcifootprint `ConfirmReceipts` | same? |
|---|---|---|
| `willDo` (tool desc + args) | `willDo` (edge desc + declared effect) | ✅ kin |
| `read` / `drivers` (context units, **scored** by a lexical/embedding scorer) | `because` (guard conditions, **KNOWN**) | ⚠️ deliberately different — a UI session cites the guard, it never guesses influence |
| `trail` (iteration + tool calls) | `recentSteps` (fire journal tail) | ✅ kin |
| `CheckInDecision {approved, by, note, at}` + `checkInApproved/Declined` | `ConfirmRecord {kind, by, note, …}` + auto-approve-on-fire / `declineConfirm` | ✅ kin, but hci auto-closes on the real fire (no separate resume) and links `transitionId` |

The one substantive divergence — `because` KNOWN vs `drivers` SCORED — is the
whole reason a UI action space is cheaper to trust than an agent's: the
precondition is authored, so its evidence is a citation, not an attribution.

## 6. Surfaces touched

- `atom/types.ts` — `ConfirmReceipts` / `ConfirmWillDo` / `ConfirmTrailStep` /
  `ConfirmRecord`; `TransitionRecord.askId`; `SessionEvents.confirm`.
- `traverse/session.ts` — `confirmAsk` / `declineConfirm` / `confirms` /
  `onConfirm`; receipt assembly; `#resolveOpenAsk` in `fire()`. Inherited
  unchanged by `InteractionSession` (uses the overridden `spec` + `#evalGuard`).
- `serve/modes.ts` — receipts + `askId` on `needs-confirm`; `decline:true` on
  step + action; schema + dispatch; taught `howToAct` / descriptions.
- `serve/mcp-server.ts` — no change: `needs-confirm` was already a normal
  JSON-serialized result; receipts ride it as-is (verified by a real MCP Client
  round-trip).

## 7. Tests

`test/confirm-receipts.test.ts` (18 tests): receipts carry real guard evidence /
effect claims / trail from a real session; `effectUnverifiable` and
`becauseUnevaluated` honesty; ask→approved linkage (`askId` on both the
transition and the row); decline path (arg + direct); supersede; standalone
decline; separate-from-gaps; `onConfirm` isolation + deep-copy safety; Mode B
step + `do_action` parity; non-high-effect edges untouched; JSON round-trip.
Plus the `mcp-server` needs-confirm test extended to assert receipts + the chain
survive the wire. Suite 281 → **299**; the `hcifootprint/testing` harness stays
green (decline rides through `SkillCallArgs` unchanged).
