# Title & abstract (settled 2026-07-13)

**Rule:** the bracketed placeholders [N], [X], [Y], [Z] are filled ONLY from `results/` aggregates.
Nothing else in the abstract may change without a ledger entry here.

## Title

**You Are Here: Grounding Web Agents in Live Sessions Their Users Are Also Driving**

Alternates (kept for the submission-time call):

- *Shared Map, Shared Pin: A Provenance-Typed Action Space for Human–Agent Co-Driving of Web Apps*
- *Grounding under Mixed Initiative: Position-Aware, Provenance-Complete Sessions for LLM Agents on the Web*

## Abstract

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

~250 words.

## Framing rules (why the abstract is shaped this way)

1. The contribution object is the **session model**, never "a library" — the implementation appears
   once, as the realization clause.
2. Three facets (position / attribution / validity) are *named* so the decomposition is citable.
3. The benchmark is claimed independently ("we contribute the first world-interleaved evaluation
   protocol") — a second creditable contribution even for reviewers who quibble with the model.
4. The final sentence is the falsifiable position the data can lose. If the kill condition in
   PREREGISTRATION.md §5 fires, this sentence — and the IUI framing — is what dies.
5. Double-blind: system name **Waypoint**; the reference implementation is cited as anonymized.
