# Decision memo — reconciling the two agent plans (2026-07-13)

Two independent agent assessments now exist: the CTXBUG-side report (scale results, triple-duty
framing, August deadline) and this repo's plan (mixed-initiative grounding, world-interleaved
benchmark). This memo records what is verified, what is not, the recommended merge, and the
decisions only Sanjay can make.

## Verified this session

- **IUI 2027: abstracts Aug 13, 2026 · full papers Aug 20, 2026** (independent tracker + official
  CFP snippet; ACM page itself blocks fetch). The October assumption in earlier planning is dead.
  Post-AAAI (Jul 21/28), the real window is **Aug 1–20**.
- hcifootprint main: 267 tests green, CI on push, packaging fixed — consistent with the report.

## NOT verifiable from this session (needs one approval click when back)

- The committed scale results in `hcifootprint-demo/dress-shop/bench/scale.jsonl`
  (22k flat vs 9.4×/10.3× DOM/AXTree growth at 500 products; crossover ~50–85 products).
  Plausible and thesis-consistent, but this session's scope is hcifootprint only; `add_repo`
  requires interactive approval. **Do not put these numbers in any abstract until re-verified.**
- The contextbug repo (CTXBUG) itself — same approval gate.

## The framing merge (recommendation)

The two spines are complementary, not competing:

| layer | source | content |
|---|---|---|
| **Problem (the WHY)** | this repo | *Grounding under mixed initiative* — position / attribution / validity when the signed-in user keeps acting. Named problems are citable; it also motivates fire-time re-checking and honesty markers as necessities, not features. |
| **Contribution (the WHAT)** | CTXBUG report | The **triple-duty action-space contract**: one hand-authored artifact that (a) gates the agent, (b) drift-tests itself against the live app with the same honesty signals it serves, (c) converts misses into a demand backlog. |
| **Evidence (the PROOF)** | both | Scale axis (committed — money chart, with the honest crossover statement), drift precision/recall (days), honesty-marker ablation (days), mixed-initiative interleave demo (harness here, smoke-green — a section, not the headline). |

Rationale: with Aug 20 as a hard wall, the paper whose money chart already exists beats the paper
whose benchmark hasn't run. But "synthesis of three jobs" alone invites the classic
system-paper kill; the named problem supplies the intellectual frame that makes the synthesis a
*solution* rather than a feature list.

## Two torpedoes the CTXBUG report missed (carry from this repo's related-work map)

1. **WebMCP** (`navigator.modelContext`, W3C, Chrome 149 origin trial) is reviewer torpedo #1 and
   appears nowhere in that report. It must be the positioning anchor: the standard ships the pipe;
   position, guards, ordering, provenance, drift are the measured gaps. It is also the `flat`
   baseline made standard.
2. **Double-claiming across the two papers.** If AAAI/CTXBUG claims the footprintjs trace/why
   novelty, the IUI paper must cite it and claim only the UI-session delta (guard-keys-as-causal-
   reads, session semantics, the contract's three duties). Coordinate before either camera-ready.

## What this repo's assets become under the merge

- `harness/` → the **interleave axis** of the benchmark repo (hacibench/mapbench), alongside
  scale (exists) + drift + honesty (to build). The drift axis's system-under-test
  (`hcifootprint/testing`) lives in THIS repo's scope — buildable without the demo repo or an API key.
- `PREREGISTRATION.md` → keep the discipline; re-scope H1–H4 to the merged evidence plan before
  freezing (the CTXBUG report independently converged on the fairness-ledger practice).
- `paper/title-abstract.md` → needs a revision pass IF the spine shifts as recommended — the
  current abstract leads with the interleave benchmark. Held pending Sanjay's call.

## Schedule (verified dates)

- **Now → Jul 28:** AAAI/CTXBUG owns Sanjay. Agent-side, the only zero-conflict prep is the drift
  mutation generator (in-scope here, no key, programmatically scored) — awaiting routing to avoid
  duplicating the other agent's queued work.
- **Aug 1–13:** abstract in; drift precision/recall + honesty ablation runs; scale numbers re-verified.
- **Aug 13–20:** full paper. Limitations stated in our own words: no foreign-app port yet, no
  demonstrated gap-loop closure, pilot perception stand-in.
- Decisions ~Nov 23; fallback UIST 2027 (CHI 2027 will have passed).

## Decisions taken under delegated authority ("use your expertise and decide", 2026-07-13)

1. **Axes builder: this session.** Drift axis built + executed (92% recall, M04 boundary discovered).
2. **Wire fixes upstreamed to the library on main** (per the direct-to-main instruction): Mode B's
   fixed set is now one-per-skill + `whats_here {sinceVersion?}` + `why {key}` + `do_action`.
   One-time prompt-cache bust for existing conversations on upgrade — acceptable pre-1.0; the
   paper's map substrate now measures the real wire, not stand-ins. Library suite 269/269.
3. **Bench repo name: `hacibench`** (recorded; repo creation still blocked by integration perms).
4. **No model runs this session** — no API key in the environment; honesty-ablation and interleave
   pilot runs stay in the Aug 1–13 window. Next buildable without a key: the honesty-axis
   scaffold (marker-stripped `map` variant + uncertainty scenarios).

## Open decisions (Sanjay only)

1. **Commit to Aug 13?** Both agents vote yes.
2. Spine merge as above — approve or adjust.
3. Benchmark repo name: `hacibench` (brand-tied) vs `mapbench`. Lean: hacibench.
4. Which agent builds the drift + honesty axes (avoid double-building); approve `add_repo` for
   `hcifootprint-demo` + `contextbug` so numbers and conventions can be verified from this session.
