# Paper outline — the argument, section by section

Target: IUI 2027 full paper (~10 pages + refs). Each section states its *job* — what the reader
must believe by its end.

## 1. Introduction

**Job: the reader believes the solo-driver assumption is broken and "grounding under mixed initiative" is real.**

- Open on the deployment reality: the assistant and the signed-in user share one live session
  (support copilots, shopping assistants, in-app agents). The user does not stop clicking.
- The three ways agents ground today (perception / selectors / flat tools) all assume a frozen
  world between observations.
- Vignette (from the actual demo): the user adds a dress to the cart by hand between turns; the
  agent's next answer must know *that it happened*, *who did it*, and *that its old plan may be stale*.
- Name the problem; preview the model, the benchmark, the three results (C1/C2/C3).
- Contributions list (model; realization; protocol + benchmark; findings).

## 2. Related work

**Job: position against four literatures without strawmanning any** — see `related-work.md`:
web agents & their benchmarks (solo-driver); tool standards (MCP → WebMCP: the pipe, not the
structure); mixed-initiative & human-agent collaboration (setting recognized, substrate unstudied);
models of interaction & provenance (task models, statecharts, GUI ripping; why induced graphs are
unsound as action spaces).

## 3. Grounding under mixed initiative (problem statement)

**Job: the three facets become precise.**

- Session, principals (user/agent/system), turns, interleaving.
- Position / attribution / validity defined over an abstract app-state trace.
- Cost model: what each substrate must inject per turn to restore grounding.

## 4. The session model (the contribution)

**Job: re-implementable from this section alone.**

- 4.1 The atoms: `Affordance = binding × guard × effect × schema`; `Transition = cause × payload × outcome`.
- 4.2 Position: the cursor; `available()` = guard-passing edges at the cursor; offer vs choose
  (the traverse inversion).
- 4.3 Provenance: cause kinds (fired/stimulus), principals, honesty markers (`inferred`,
  `effectVerified`, claimed navigation).
- 4.4 **Causality through preconditions:** guard keys recorded as the transition's reads → backward
  slicing answers attribution and explanation with no extra bookkeeping. (The paper's most novel mechanism.)
- 4.5 Re-grounding: the O(Δ) brief — position + who-did-what-since + what's-fireable-now; the
  two-string-class rule extended to history narration.
- 4.6 Validity: total-order version, CAS on fire, fire-time guard re-evaluation, motion-scoped
  staleness (modal-close vs list-scroll), typed rejections as the recovery contract.
- 4.7 Realization: reference implementation facts (tests, zero-dep core, MCP serving); one
  paragraph, no marketing.

## 5. The world-interleaved evaluation protocol

**Job: the benchmark is credible and reusable.**

- Protocol: scripted user actions injected between agent turns; identical scripts across substrates.
- The three substrates, and the fairness rules (same model/params/prompt care; token accounting).
- Tasks, success checks, attribution probes; apps (#1 authored; #2 retrofit, tasks adapted from an
  existing benchmark's templates).
- Limitations of the pilot perception stand-in; the browser AXTree version.

## 6. Results

**Job: each claim gets one figure.**

- 6.1 C1: resync tokens vs interleave level (per substrate, per app).
- 6.2 C2: attribution accuracy (+ the downstream-behavior probe: does the agent undo the user?).
- 6.3 C3: outcome taxonomy of post-interleave actions (wrong-world / typed-rejection→replan / correct).
- 6.4 Parity: success, steps, wall-clock. 6.5 Ablations: no-position, no-guards, no-brief, no-provenance.

## 7. Discussion

- What flat tool standards (WebMCP) would need to add for mixed initiative — the standards-facing takeaway.
- Authoring cost honestly (retrofit measurement); the drift risk and the harness answer (one paragraph).
- Provenance is cooperative, not a security boundary; where the model's honesty markers matter.
- Generalization: desktop apps, multi-user sessions, agent-agent co-driving.

## 8. Limitations & 9. Conclusion

- Limitations: two apps; scripted (not naturalistic) interleaving; one model family; headless app #1;
  FIFO attribution edge; EventLog growth.
- Conclusion returns to the thesis sentence.

## Appendices / artifact

- Preregistration diff (frozen → amendments); full task set + interleave scripts; prompt texts per
  substrate; raw-results pointer; anonymized artifact for review.
