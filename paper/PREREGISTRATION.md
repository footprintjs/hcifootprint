# Preregistration — grounding under mixed initiative

**Drafted:** 2026-07-13 · **Status: DRAFT — freezes at the first real (non-mock) episode.**
After freeze, changes land only under *Amendments* with a date and a reason.

## 1. Research questions

- **RQ1 (cost).** When a human acts in the session between agent turns, what does it cost each
  grounding substrate for the agent to become correctly grounded again?
- **RQ2 (attribution).** Can the agent correctly attribute state changes to the principal who made
  them (user / agent / system), and does correct attribution change downstream behavior?
- **RQ3 (validity).** When the world moves after a plan is formed, does the substrate convert
  stale intentions into recoverable failures — or into wrong-world actions?
- **RQ4 (parity guard).** Do C1–C3 gains cost anything in task success or steps?

## 2. Hypotheses (falsifiable, directional)

- **H1 (C1):** resync cost (tokens injected per post-interleave turn) is lower for `map`
  (O(Δ) brief) than `perception` (O(page) dump), with the gap growing in app size and
  interleave intensity. `flat` pays no resync tokens but shows the H2/H3 failures instead.
- **H2 (C2):** attribution accuracy on probe questions: `map` > 90%; `perception` and `flat`
  ≈ chance when the acting principal is not inferable from content alone.
- **H3 (C3):** wrong-world action rate (fires that would act on a state the agent last saw but
  that no longer holds) is ~0 for `map` (converted to typed rejections: `GUARD_FAILED`,
  `STALE_CURSOR`, `NOT_ON_NODE` — followed by successful replan) and > 0 for `flat`;
  `perception` falls between, paying re-perception cost to avoid it.
- **H4:** task success for `map` ≥ each baseline; steps-to-success for `map` ≤ `perception`.

**Pre-registered risk (honesty):** on a small app (app #1), H1 may show near-parity — the page dump
is small. This was anticipated in the reference implementation's research notes (H9 caveat). The
paper reports it either way; H1's strong form is claimed only if the effect appears on app #2 (larger).

## 3. Design

Within-task, three substrates, same model and parameters.

- **Substrates:** `map` (position-aware guarded action space + O(Δ) brief + provenance `why`);
  `flat` (WebMCP-style: every declared action as an always-visible tool, authored descriptions,
  no position/guards/brief); `perception` (per-turn serialized page dump; generic
  click/type/select tools bound by accessible name).
- **Interleave levels:** `none` (0 user actions), `light` (1 scripted user action after agent turn 1),
  `heavy` (3 user actions at scripted points). Scripts are data (`harness/src/interleave.ts`),
  identical across substrates.
- **Tasks:** app #1 task set in `harness/src/tasks.ts` (find/filter/purchase/track variants with
  programmatic success checks). Target pilot matrix: ~10 tasks × 3 substrates × 3 interleave
  levels × 3 seeds.
- **Model:** one fixed model id for all pilot cells (recorded in results metadata); temperature and
  max_tokens identical across substrates.

## 4. Measures (computed only from raw transcripts + session ground truth)

| id | measure | source |
|---|---|---|
| M1 | prompt tokens per turn; per task; resync tokens (context injected after interleave) | API `usage` fields |
| M2 | attribution accuracy (probe answers vs session provenance ground truth) | probes + `transitions()` |
| M3 | wrong-world action rate; typed-rejection rate; replan success after rejection | `FireResult` + transitions |
| M4 | task success (programmatic check); steps; wall-clock | task checks + logs |
| M5 | (secondary) guard-violation attempts under `flat` — the false-affordance cost | rejection reasons |

## 5. Exclusions & kill conditions

- An episode aborts after 25 agent turns or 3 consecutive identical failed calls → counted failed.
- API/infra errors (not model behavior) → cell rerun with same seed; the aborted transcript is kept.
- **Kill condition for the paper's strong claim:** if on app #2 the `map` substrate shows < 1.5×
  resync-token advantage AND attribution advantage < 20 points, the IUI framing is dropped and the
  work is reported as an engineering paper (EICS) with null results stated.

## 6. Analysis

Means with bootstrap 95% CIs per cell; the pilot is estimation, not confirmation — no significance
theater at pilot N. Per-claim plots: M1 vs interleave level (C1), M2 by substrate (C2), M3 stacked
outcome bars (C3). All analysis scripts live in `harness/` and recompute from `results/` raw files.

## 7. Threats we accept and state

- App #1 and its tasks are authored by the same team as the reference implementation (circularity):
  mitigated by app #2 (retrofit of an app we did not write, tasks adapted from an existing benchmark's
  templates) before any camera-ready claim.
- The pilot `perception` substrate is a headless page-dump stand-in, not a browser AXTree; the full
  study replaces it with real accessibility-tree serialization over the browser demo. Pilot findings
  for `perception` are directional only.
- Provenance attribution in the reference implementation degrades FIFO under same-signature
  interleaved settlements; episodes hitting that path are flagged via the `inferred` marker.

## Drift axis (added 2026-07-13, pre-freeze; merged spine per DECISIONS.md)

Mutation-testing the drift harness itself: 13 single-fault mutants over the shop
(graph-side guard/page/skill/effect faults; app-side handler/nav faults), scored against the
harness's layers in CI order — compile → static lint diff → behavioral (report + journey).
Per-mutant layer predictions were logged in code (`harness/src/drift/mutations.ts`) **before first
execution**; one mutant (M13 guard-weakened) was preregistered as a designed miss to measure the
journey-coverage boundary.

**Executed 2026-07-13** (deterministic, no model in the loop — results in `results/drift/`):
baseline clean (precision holds) · **recall 11/12 catchable = 92%** · designed miss confirmed 1/1 ·
layer-prediction accuracy 11/13 = 85%. Two deviations, both kept as findings:

- **M04 (discovered boundary):** a stale declared-write list is invisible when the key exists in
  initial state (key-level lint counts it producible) and the app still writes it (extra writes
  unflagged at settlement). Goes to limitations + a candidate library improvement.
- **M09:** caught one layer earlier than predicted (gap rows precede the journey throw) — the
  layered design is stronger than assumed, not weaker.

## Honesty axis (scaffold pending — needs API runs)

Marker ablation (`map` vs `map` with honesty fields stripped from results and brief) over
uncertainty scenarios (still-mounting, assumed-active, unverifiable effect): measure correct
replanning vs hallucinated success. To be preregistered in full before its first run (August window).

## Amendments

- **A1 (2026-07-14) — pilot model `claude-opus-4-8` → `claude-sonnet-5`.** Reason: Sanjay's
  directive after the credit-exhaustion run ("API credits cost is high — use the appropriate
  model"); Sonnet 5 is near-Opus on agentic work at ~40% of the price (intro $2/$10 per MTok).
  The only completed Opus cells (1 sanity + 1 pilot episode, run 2026-07-14T04-16-20) are
  excluded from analysis — that run is marked infra-failed and the matrix reruns in full on
  Sonnet 5. One model per pilot still holds; §3's "one fixed model id" now reads `claude-sonnet-5`.
