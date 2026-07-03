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
