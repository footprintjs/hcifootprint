# Run 2026-07-14T04-34-01 — first complete matrix (claude-sonnet-5, 54/54 cells, 0 infra errors)

Cost ≈ $7.5 at intro pricing. Aggregate table in SUMMARY.md; per-task grid and the honest reading
below. **Pilot = estimation + instrument-debugging, not confirmation (PREREGISTRATION §6).**

## Per-task grid (S=success, f=fail, !=hit the 25-turn cap)

| task | map | flat | perception |
|---|---|---|---|
| T1 control | S S S | S S S | S S S |
| T2 conflicting (user opens d2 mid-purchase) | f f! f! | f f f | f f! f! |
| T3 restraint (user adds d4; don't order) | S! S! S! | S S S | S S S |
| T4 who-did-what (concurrent adds) | f! f! f! | f f f | f! f! f! |
| T5 diverging (user navigates away mid-flow) | **S S S** | **f f f** | **f f f** |
| T6 hostile catalog | S S S | S S S | S S S |

## The signature result: T5 — 100% vs 0% vs 0%

When the user navigates the app away mid-task, **only the position-aware substrate recovers**
(3/3); flat and perception fail 6/6. This is the paper's mixed-initiative claim in one cell:
position (cursor + sync + whats_here) is what survives a human moving the world. Flat has no
concept of "where"; perception re-reads but loses the thread.

## Attribution (C2): clean signal after removing contaminated probes

Raw: map 75%, flat 50%, perception 50%. But every truth=agent probe (0/3 everywhere) came from
T4, where the intended agent action mostly never happened (see below) — those probes have a
**false premise** and are invalid as scored. On the valid user-truth probes:
**map 9/9 (100%) vs flat 6/9 vs perception 6/9 (67%)**. Provenance answers "who did that?"
perfectly; content-inference gets it 2/3. Direction supports H2; n is pilot-small.

## Tokens (H1): the pre-registered small-app risk, confirmed — plus a driver gap

map 130.7k/task vs flat 13.1k vs perception 50.2k. Three compounding causes, all honest:
(1) the app is tiny — exactly PREREGISTRATION's pre-registered risk (crossover favors baselines
below ~50–85 products; the scale axis owns size-independence, not this pilot);
(2) map's turn counts are inflated by T3's investigative overrun and T2/T4 flailing (20.6 turns
vs flat's 7.6);
(3) **the driver sends no cache_control** — Mode B's fixed tool array is designed for prompt
caching, and the pilot pays full price for the design without collecting its benefit. Full study:
enable caching for ALL substrates identically and report cache-read tokens separately (M1 amendment).

## The T2/T4 zero rows are a real hazard + an instrument bug

Mechanism (from transcripts): the user's interleave changes `selectedDressId`, so the agent's
next add-to-cart **adds the dress the USER opened, not the one the agent intended** — the
selection-clobber IS the mixed-initiative hazard the paper describes, and NO substrate recovered
(map had the signals — version jumps, whats_here {sinceVersion} — but agents didn't re-verify
selection before add-to-cart). Keep the cells as hazard demonstrations; fix the instrument:
- T4's truth=agent probes assume the agent's add succeeded — score against ACTUAL provenance,
  or drop the probe when the premise fails.
- Add graded credit (e.g. "did not buy the wrong item") so hard cells discriminate.

## Abort ≠ failure: the cap conflates thoroughness with flailing

T3's map episodes SUCCEEDED (correctly refused to order) but all hit the 25-turn cap while
*investigating who added d4* (`why`/`why` calls in the closing turns) — the abort flag punished
exactly the deep-verification behavior the substrate enables. Split the metric: `capped-complete`
vs `loop-abort` (3-identical-failures).

## Follow-ups before the full study

1. Driver: cache_control on tools+system (all substrates); report cache reads separately.
2. Measures: valid-probe attribution split; capped-complete vs loop-abort; per-task token medians.
3. Tasks: graded credit on T2/T4; probe truths from actual provenance.
4. Map-substrate prompting: contract already says "call whats_here {sinceVersion} when things look
   different" — agents under-used it mid-skill; consider one contract sentence: re-verify selection
   before high-consequence steps. (Fair: flat/perception get equivalent care per §4.)
