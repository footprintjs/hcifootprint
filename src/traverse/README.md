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

## nav-session.ts — the D18 composition layer

`NavSession extends Session` and is where the independent layers meet: the
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

