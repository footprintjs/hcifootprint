# Related work — the positioning map

Verified against the landscape as of **2026-07-13** (searches logged in the project conversation
ledger). Rule: every "first" claim in the paper must survive this file; update it before drafting §2.

## 1. Web agents and their benchmarks (the solo-driver assumption)

- **Perception lineage:** Mind2Web, WebArena/VisualWebArena, SeeAct, WebVoyager, OSWorld,
  computer-use agents; BrowserGym ecosystem (arXiv 2412.05467). Per-turn DOM/AXTree/screenshot
  serialization is the cost baseline C1 targets. All benchmark the agent **alone** in the session.
- **Safety-side:** WebGuard (arXiv 2507.14293) — learned risk guardrails for agent actions.
  Contrast: our confirm gates are **app-declared**, not learned; complementary.
- **Skill learning:** SkillWeaver, WebXSkill (arXiv 2604.13318), Agent Workflow Memory — skills
  **induced** from traces. Our position: preconditions are unrecoverable from positive-only traces;
  a false affordance an agent fires is worse than none (soundness argument, §7).
- **GraSP (arXiv 2604.17870, Apr 2026):** "first executable skill graph architecture for LLM
  agents" — typed DAG, precondition–effect edges, compiled from **retrieved agent-side skills**.
  MUST CITE and differentiate: ours is the **app-side, declared, live** interaction surface shared
  with a human — different object, different owner, different lifetime. We cannot claim "first
  skill graph"; we claim first *provenance-typed shared-session* graph.

## 2. Tool standards (the pipe, not the structure)

- **MCP** — flat tool lists; no position, no inter-action dependencies, no history semantics.
- **WebMCP / `navigator.modelContext`** (W3C WebML CG; Google+Microsoft; announced 2026-02-10;
  Chrome 149–156 origin trial as of June 2026; lineage: MCP-B Jan 2025 → unified proposal Aug 2025 →
  W3C CG acceptance Sept 2025). The page **is** the server; tools reuse the page's JS; agent
  inherits the signed-in session. **This is our `flat` baseline made standard.** Positioning
  sentence: WebMCP standardizes *that* apps expose tools; it says nothing about *position, guards,
  ordering, provenance, or drift* — exactly the four gaps this paper measures. Also our adoption
  path: the session can emit WebMCP.
- **MCP Apps (Jan 2026)** — UI capabilities for MCP clients; orthogonal (host-side rendering).

## 3. Mixed initiative & human–agent collaboration (setting recognized, substrate unstudied)

- Classic: Horvitz 1999 mixed-initiative principles; Clark's common ground.
- **CowPilot / CowCorpus (arXiv 2602.17588, Feb 2026):** 400 real trajectories of humans
  intervening in web-agent runs. Studies **when/how humans intervene** — behavior, not the
  grounding substrate. Keep their intervention taxonomy for our interleave scripts.
- **InterruptBench (arXiv 2604.00892, Apr 2026):** mid-task **instruction** changes (Addition /
  Revision / Retraction) on WebArena-Lite. We interleave **world actions**, not instructions —
  cite their simulation procedure as the method we adapt.
- **Collaborative Gym (arXiv 2412.15701):** async human-agent collaboration framework; task-level,
  perception-substrate.
- CHI 2026 Human-Agent Collaboration workshop names "acting without provenance" as an open failure —
  quote for §1.
- Co-editing provenance (docs, code): who-wrote-what exists for *artifacts*; we do it for
  *operational sessions*.

## 4. Models of interaction, provenance & testing (the deep roots — respect them)

- **Task models / model-based UI:** ConcurTaskTrees (Paternò), CAMELEON/UsiXML, MARIA; statecharts
  (Harel) / XState — right statics, source-of-truth-shaped; no provenance, no commit log, no
  parameterized `available()`.
- **GUI ripping / event-flow graphs** (Memon et al.): precondition–effect graphs for GUI **testing**;
  induced from exploration — the soundness contrast again.
- **Crawljax → Temac (2025):** crawled UI graphs; unsound as action spaces (positive-only traces).
- **Program slicing / provenance:** backward slicing (Weiser), why-provenance (databases),
  provenance in visualization (interaction logs). Our twist: **guard keys double as causal reads**,
  so slicing needs no instrumentation of the app.
- **Robotic Process Automation / DAPs** (WalkMe, Pendo): authored flows at commercial scale;
  selector rot is their known failure; one paragraph in §7 (drift).

## 5. The claims this map licenses (and forbids)

| claim | verdict |
|---|---|
| "first skill graph for agents" | ❌ forbidden (GraSP) |
| "first to let agents act through the app's own UI as the signed-in user" | ❌ forbidden (WebMCP, MCP-B) |
| "we formalize grounding under mixed initiative" | ✅ (name is ours; facets defined here) |
| "first world-interleaved evaluation protocol for web agents" | ✅ (InterruptBench = instructions; CowCorpus = corpus of interventions in the *agent's* run, perception substrate) — re-verify at submission |
| "first provenance-typed shared-session model with causality-through-preconditions" | ✅ — re-verify at submission |
| "structure beats perception for mixed-initiative grounding" | data-dependent (the bet) |
