# HCIFootprint — research notes

> Working notes toward a paper submission (candidate venues: **IUI 2027**, **CHI 2027**; fallback: UIST, EICS).
> Kept current as the library evolves — every design claim here is either code-backed (cite the test) or tagged OPEN.
> The full running decision/hypothesis ledger (`RESEARCH_STATE`, v13 lineage) lives in the project conversation log;
> this file is the durable extract.

## One-sentence thesis

A web app's interaction surface, declared once as a typed **skill graph** (Affordance = binding × guard × effect × schema)
and traversed live with **provenance** (user / agent / system / unknown), gives an LLM a compact, position-aware action
space — replacing per-step 10k–100k-token DOM perception — while a transactional commit log makes every answer about the
session *explainable* ("why is this button available?", "who changed the cart?").

## Candidate contributions (ranked)

1. **The traverse() inversion.** Run-to-completion engines (workflow engines; footprintjs `run()`) *choose* a path;
   a live UI must *offer* all guard-passing edges and let the world (user or agent) pick. We formalize the driver as
   `available / fire / sync` with optimistic-concurrency (cursor versions) and fire-time guard re-evaluation —
   mixed-initiative safety as a library contract, not agent prompting. (Code: `src/traverse/`, CAS + interleaving tests.)
2. **Provenance as a first-class trace dimension.** One interaction log where user clicks, agent actions, and
   system stimuli interleave with principals; honesty markers everywhere the system guesses
   (`effectVerified`, `toNodeClaimed`, `unverifiedEdge`, `inferred`). Empirical grounding: `isTrusted` is
   insufficient (CDP/WebDriver input is trusted; `form.requestSubmit()` forges a trusted submit on Chromium) —
   provenance is *accountability for cooperating agents*, never a security boundary.
3. **On-demand disclosure over a derived dependency DAG.** Skills serve as one-line plans; committing expands only
   the skill's currently-fireable tools + escape tools; intra-skill ordering is **computed** from
   effect.writes ∩ guard-keys (never hand-authored → cannot drift). Frames demote when the world breaks a
   precondition. (Code: skill frames, `skillPlan`, demotion tests.)
4. **The context brief.** Between chat turns the user acts on their own; `contextBrief({sinceVersion})` serves the
   who-did-what delta as prompt-ready text built from authored strings + structural facts only — extending the
   prompt-injection firewall (two string classes) from tools to *history*.
5. **Declare statically, bind dynamically (additive integration).** The graph is compile-time (plannable, CI-verifiable);
   live bindings register at render (`registerTools`, groups, last-wins) with three manual-capture tiers:
   T1 DOM sensor (capture-phase root listener) / T2 effect-signature inference (exactly-one match, `inferred` flag) /
   T3 wrapped triggers (opt-in exact provenance). Zero component-code changes required.
6. **Ecosystem substrate reuse (systems contribution).** The same transactional commit log + backward-slice toolchain
   (footprintjs) explains backend runs, agent runs, and now UI sessions — `causalChain`/`sliceForKey` run on UI
   traces with zero new query code (Code: `test/trace.test.ts`).

## Positioning vs prior art (from the 14-agent adjudication)

- **Statecharts/XState**: right statics (hierarchy, guards, parallel regions) but source-of-truth-shaped; no provenance,
  no commit log, no slicing; `state.can(event)` needs a concrete event → parameterized `available()` isn't free there.
- **GUI crawling lineage (Crawljax → Temac 2025)**: inferred graphs are unsound as action spaces — preconditions are
  unrecoverable from positive-only traces (a false affordance fired by an agent is worse than none). We author/derive
  structure and *record* usage; induction only as code suggestions.
- **Web agents (Mind2Web/WebArena/SeeAct/computer-use)**: per-step DOM/AXTree perception is the cost baseline our
  central hypothesis (H9) targets; also our evaluation harness.
- **MCP**: flat tool lists — no position, no inter-action dependencies. We emit per-edge MCP descriptors *from* the
  guard-filtered slice (grain finding: footprint's own toMCPTool is one-tool-per-chart + permanently cached — wrong
  grain for a per-turn action space).
- **DAPs (WalkMe/Pendo/Whatfix)**: commercial validation of authored flows; different payer/cadence; selector rot is
  their known failure — our enforcement spine (build-time validation, drift telemetry, `materialized`) is the answer.

## The study plan (X2 — the go/no-go)

**Instrument:** the dress-shop demo (`examples/dress-shop/`): mock e-commerce app (browse → filter → select →
add-to-cart → checkout → order inquiry) + a chatbot agent consuming `availableSkills`/`toMCPTools`/`contextBrief`.

**Design:** within-task comparison, same model, same tasks:
(a) per-step accessibility-tree serialization (web-agent baseline);
(b) HCIFootprint slice (skills-first disclosure + brief).
**Measures:** tokens/turn and /task, steps, task success, precondition-violation rate (fires rejected by
GUARD_FAILED/STALE_CURSOR), plus qualitative "why" answer quality via `why()`/`contextBrief`.
**Secondary (H10):** guards from store-tap state vs DOM-scraped state → violation-rate delta ("capability cliff").
**Open risks:** H9 could fail on token-parity for small pages (DOM slice ≈ graph slice); disclosure gains need
multi-skill graphs to show; inference tier needs a signature-collision study (when do apps' write-sets overlap?).

## Honest-limitations ledger (write these in the paper, not reviewers' rebuttals)

- Provenance is cooperative (uncooperative drivers are indistinguishable at the DOM; requestSubmit forges trusted submits).
- effectVerified checks declared-key presence, not values; navigation claims verify only via sync.
- Settle-time guard-read provenance can mis-attribute under interleaved pendings (fire-time evidence is authoritative;
  fix designed, not built).
- FIFO settlement can mis-attribute same-signature deltas (transitionId targeting + `effectVerified=false` detector).
- EventLog grows unbounded (session-rebase shim designed); one skill frame at a time; suspend/resume open (Q11).

## Timeline anchors

- 2026-07-02: adjudication (14-agent grounded workflow) — engine-bend eliminated with code evidence; memory-layer reuse
  proven by execution; atom amended (schema, cause, settlement, honesty markers).
- 2026-07-02: v0 core shipped (63 tests) after 3-lens adversarial review (27 probe-confirmed findings fixed).
- 2026-07-03: skill frames + contextBrief (83 tests); D13 registerTools/tiers/inference (97 tests); layered restructure.
