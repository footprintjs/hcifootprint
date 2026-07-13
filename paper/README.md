# Waypoint — the paper repo

> **Parked** under `hcifootprint/paper/` for now: the session's GitHub integration can neither
> create repositories (403) nor get `add_repo` approved unattended. Once `footprintjs/waypoint-paper`
> exists, split this directory out unchanged (`git subtree split -P paper`) and flip one line:
> `harness/package.json` → `"hcifootprint": "file:../../hcifootprint"` (side-by-side layout).

> **You Are Here: Grounding Web Agents in Live Sessions Their Users Are Also Driving**
> Target venue: IUI 2027 (fallback: EICS 2027). Working system name: **Waypoint**
> (the anonymized name for the reference implementation, [hcifootprint](https://github.com/footprintjs/hcifootprint) —
> never use the real library name in any file destined for the submission).

## The thesis (one sentence)

Structure — a shared typed position over a declared interaction graph, with provenance-typed history —
not richer per-turn perception, is what keeps a human–agent team grounded in a live web app.

## The problem we name

**Grounding under mixed initiative.** Web agents are built and benchmarked as solo drivers
(per-turn DOM/AXTree perception, or flat WebMCP-style tool lists). Deployed assistants share a live,
authenticated session with a human who keeps acting between agent turns. After the human acts, the
agent must relearn:

| facet | question | our mechanism |
|---|---|---|
| **position** | where does the session stand now? | graph cursor + `sync()` |
| **attribution** | what changed, and *who* changed it? | provenance-typed commit log, `why()` backward slice |
| **validity** | does my plan still match the world? | versioned CAS + fire-time guard re-evaluation |

## The three claims (falsifiable — see PREREGISTRATION.md)

- **C1 — grounding cost:** re-grounding after human actions is O(Δ) with the structured brief vs O(page) re-perception.
- **C2 — attribution:** "who did X?" is answerable from provenance, near-chance from perception/flat tools.
- **C3 — stale-world safety:** versioned concurrency turns wrong-world actions into typed, recoverable rejections.

## Repo map

```
PREREGISTRATION.md      hypotheses, design, measures, kill conditions — DATED, frozen before runs
paper/
  title-abstract.md     the settled title + abstract (placeholders [X] filled only from results/)
  outline.md            section-by-section argument skeleton
  related-work.md       the positioning map (WebMCP, GraSP, CowCorpus, InterruptBench, …)
benchmark/
  design.md             the world-interleaved evaluation protocol + fairness rules
harness/
  src/apps/dress-shop/  app #1 (mirrors the reference implementation's example app)
  src/substrates/       the three grounding substrates: map / flat / perception
  src/interleave.ts     scripted user actions injected between agent turns
  src/tasks.ts          task set with programmatic success checks + attribution probes
  src/runner.ts         episode loop (Anthropic API or MockLLM), token accounting
  src/measures.ts       C1/C2/C3 metrics from ground-truth provenance
results/                raw episode transcripts + aggregated tables (committed, never edited)
```

## Working rules (inherited from the reference implementation's conventions)

1. Every design claim is code-backed (cite the test) or tagged OPEN.
2. The preregistration freezes before the first real run; deviations are logged in an amendments
   section, never silently edited.
3. Results are committed raw. Analysis scripts recompute tables from raw transcripts — no hand-edited numbers.
4. Substrate fairness: identical model, params, system-prompt care, and token accounting across substrates
   (rules in `benchmark/design.md` §4). Any prompt improvement to one substrate must be offered to all three.
5. The submission never names the reference implementation; `Waypoint` throughout.

## Status

- [x] Problem framing, claims, venue decision (conversation ledger, 2026-07-13)
- [x] Title + abstract — FINAL, accepted by Sanjay (`paper/title-abstract.md`)
- [x] Spine merged with the CTXBUG-side plan; IUI 2027 = **abstracts Aug 13, papers Aug 20** (verified)
- [x] Preregistration drafted — **freeze before first model run**
- [x] Interleave harness: three substrates over app #1, MockLLM smoke tests green
- [x] **Drift axis executed**: 13 mutants, baseline clean, recall 92%, designed miss confirmed,
      one boundary DISCOVERED (M04 stale declared-writes) — `results/drift/`
- [ ] Honesty axis: marker-ablation substrate + scenarios (scaffold next; runs need `ANTHROPIC_API_KEY`)
- [ ] Scale axis numbers re-verified from the demo repo's committed `scale.jsonl` (needs repo access approval)
- [ ] Interleave pilot run (6 tasks × 3 substrates × 3 seeds) — needs `ANTHROPIC_API_KEY`
- [x] **Wire fixes upstreamed to the library** — Mode B now serves three fixed generics:
      `whats_here {sinceVersion?}` (O(Δ) resync) and `why {key}` (causal slice) ship over real MCP;
      the map substrate rides the real wire, stand-ins deleted
- [ ] App #2: retrofit onto an app we did not write (+ authoring-cost measurement) — honestly
      deferred to limitations if the August window forces it
- [ ] Full paper draft (Aug 13–20 window)

## Run

```bash
# in-place (parked) layout — build the library at the repo root first:
#   npm install && npm run build
cd paper/harness
npm install
npm test                                   # MockLLM smoke episodes, no API key needed
ANTHROPIC_API_KEY=… npm run pilot          # the real pilot matrix → ../results/
```
