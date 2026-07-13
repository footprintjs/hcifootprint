# Title & abstract — v2, the merged spine (2026-07-13)

**Rules:** bracketed placeholders are filled ONLY from verified results (`results/` aggregates, or
the demo repo's `scale.jsonl` once re-verified — see DECISIONS.md). Nothing else changes without a
ledger entry here. v1 (interleave-benchmark spine) is archived at the bottom.

## Title

**The Map That Tests Itself: A Triple-Duty Action-Space Contract for Web Agents in Live, Mixed-Initiative Sessions**

Alternates (submission-time call):

- *You Are Here: A Self-Testing Action Space for Agents Driving Web Apps Alongside Their Users*
- *Declare Once, Drive Together: Size-Independent, Drift-Tested Action Spaces for Human–Agent Web Sessions*

## Abstract (~250 words)

> Agents that operate web applications are built as solo drivers: they re-perceive the interface
> every turn — screenshots, DOM, or accessibility-tree dumps — or, under emerging standards such
> as WebMCP, receive a flat list of callable tools. Deployed assistants face two harder realities:
> they share a live, authenticated session with the human they act for, who keeps clicking while
> the agent works; and the app keeps changing after the integration ships. We name the first
> problem *grounding under mixed initiative* — maintaining position (where the session stands),
> attribution (who changed what), and validity (whether earlier intentions still hold) — and treat
> the second, drift, as the same problem on a longer clock. We introduce an action-space
> *contract* that answers both with one artifact: the application declares its interaction surface
> once, as a typed graph of affordances (binding × guard × effect × schema), and that single
> declaration does three jobs. It **gates** the agent — only guard-passing edges at the current
> position are offered, and fire-time re-evaluation under versioned concurrency converts actions
> invalidated by the human's concurrent activity into typed, recoverable rejections. It **tests
> itself** — the honesty signals served to the agent (assumed activation, unverified effects)
> double as a drift harness that scores the declaration against the live app, mutation-testing
> style. It **grows the app** — asks no affordance can serve become structured demand records.
> We realize the contract in an open-source reference implementation and evaluate it on a
> three-axis benchmark. Token cost is size-independent: [X]k tokens from [N₁] to [N₂] products,
> versus [Y]× growth for DOM and accessibility-tree baselines — which remain cheaper below
> ~[C] products. The drift harness catches [R]% of injected app mutations at [P]% precision, and
> ablating the honesty signals drops correct replanning by [Δ] points. One declared contract —
> not richer perception — makes agents on live web apps cheap at scale, safe under shared
> control, and honest about what they cannot see.

## Framing rules (why it is shaped this way)

1. The contribution object is the **contract** (a model), never "a library"; the implementation
   appears once, as the realization clause.
2. The problem frame stays *grounding under mixed initiative* (named, three facets) — it makes the
   triple-duty synthesis a solution to a problem, not a feature list (the system-paper kill).
3. Drift is framed as **the same problem on a longer clock** — one sentence that unifies the
   paper's two halves and is itself a citable observation.
4. The scale claim is stated with its crossover: **size-independence, never constant discount**.
   Below ~[C] products the baselines win, and the abstract says so — credibility over bravado.
5. All three results carry placeholders until verified: scale from the demo repo's committed
   `scale.jsonl` (re-verify first — DECISIONS.md), drift and honesty from runs that do not exist
   yet. The final sentence is the falsifiable position the data can lose.
6. Double-blind: system name **Waypoint**; the reference implementation cited as anonymized;
   the AAAI/CTXBUG paper cited for the trace substrate, with only the UI-session delta claimed here.

---

## Archived v1 (interleave-benchmark spine, superseded 2026-07-13)

**You Are Here: Grounding Web Agents in Live Sessions Their Users Are Also Driving**

> Agents that operate web applications are built and benchmarked as solo drivers: they re-perceive
> the interface on every turn — via screenshots, DOM, or accessibility-tree serializations — or,
> under emerging standards such as WebMCP, receive a flat list of callable tools. Deployed
> assistants, however, share a live, authenticated session with the human they act for, and that
> human continues to act between agent turns. We formalize the resulting problem as *grounding
> under mixed initiative*: maintaining, at every turn, a correct account of position (where the
> session now stands), attribution (what changed, and which principal changed it), and validity
> (whether intentions formed earlier still hold in the present state). We introduce a session model
> in which an application declares its interaction surface once as a typed graph of affordances —
> binding × guard × effect × schema — and every human, agent, and system action commits to a single
> provenance-typed log. Because each affordance's guard keys are recorded as its causal reads,
> attribution and explanation reduce to backward slicing over the log, and re-grounding reduces to
> an O(Δ) structured brief rather than re-perception. We realize the model in an open-source
> reference implementation and contribute the first *world-interleaved* evaluation protocol for web
> agents, in which scripted user actions are injected between agent turns. Across [N] applications
> and three grounding substrates — perception, flat tools, and the typed graph — the model reduces
> re-grounding cost by [X]×, raises attribution accuracy from [near-chance] to [Y]%, and prevents
> [Z]% of stale-world actions through versioned concurrency control, at equal or higher task
> success. The results indicate that structural grounding, not richer perception, is the binding
> constraint on safe mixed-initiative operation of web applications.

The world-interleaved protocol and its harness remain in this repo as the mixed-initiative
evidence section and the fourth benchmark axis (see DECISIONS.md).
