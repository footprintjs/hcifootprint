# The world-interleaved evaluation protocol

The benchmark's one idea: **the world moves between agent turns because the user is also driving.**
Everything else is controls.

## 1. Episode shape

```
task prompt ─► agent turn 1 ─► [interleave: scripted user actions] ─► agent turn 2 ─► … ─► done/abort
```

- The agent runs an ordinary tool loop (one Messages request per turn, tools per substrate).
- After designated agent turns, the harness fires scripted **user** actions through the app's own
  handlers (`source: 'user'`) — the same code path a human click takes in the reference
  implementation's demo (`!affordance-id` idiom).
- Scripts are data, identical across substrates; the agent is never told an interleave happened —
  *discovering it is the point.*

## 2. Substrates (the independent variable)

| | `map` (ours) | `flat` (WebMCP-style) | `perception` (web-agent baseline) |
|---|---|---|---|
| tools | fixed: 1/skill + `whats_here` + `do_action` (+ `why`) | one tool per **declared** action, always visible | generic `click` / `type_into` / `select` / `read_page` |
| what the agent sees per turn | O(Δ) brief: position, who-did-what-since, fireable-now | nothing (tool results only) | full serialized page dump each `read_page` |
| position | cursor, guard-filtered | none | implicit in dump |
| attribution | provenance + `why` | none | inferable from content only |
| staleness | CAS + fire-time guard re-eval → typed rejections | none — fires land or fail opaquely | none — acts on last dump |

Pilot note: `perception` is a headless stand-in (serialized page state + controls by accessible
name from the graph's ARIA bindings). The full study replaces it with browser AXTree over the demo
storefront. Stated in PREREGISTRATION §7.

## 3. Interleave scripts (the second independent variable)

- `none` — control.
- `light` — 1 action after agent turn 1 (e.g., user adds a different dress to the cart).
- `heavy` — 3 actions at turns 1/2/3 (e.g., user filters, opens another dress, adds it; or user
  *undoes* the agent's setup: navigates away / empties selection).
- Script taxonomy borrows CowCorpus intervention kinds: **augmenting** (helps the task),
  **diverging** (unrelated), **conflicting** (invalidates the agent's plan). Each task declares one
  script per level per kind it supports.

## 4. Fairness rules (reviewers attack here first)

1. Same model id, temperature, max_tokens, and retry policy for every cell; recorded in results metadata.
2. System prompts: same length-band and care per substrate; each explains its own tool contract and
   nothing else. Any wording improvement to one substrate is ported to all three or rejected.
3. Token accounting from API `usage` fields only; per-request, summed per turn/task. The `map`
   brief counts against `map` — no free context.
4. `flat` gets the **same authored descriptions** the map uses (it is not a strawman: it is WebMCP
   with our own strings).
5. `perception` may call `read_page` at will; its dump is faithful (full current page: controls +
   visible state values), never padded.
6. Abort rules identical (25 turns / 3 identical consecutive failures).

## 5. Tasks (app #1: dress-shop)

10 tasks × 3 interleave levels; each defines: prompt, script, programmatic success predicate over
`session.state()` + node, and 2 attribution probes asked post-task ("Who added d4 to the cart —
you or the user? one word"). Ground truth from `session.transitions()` provenance. See
`harness/src/tasks.ts`.

Examples:
- **T3 find-and-buy / conflicting-light:** "find a red dress under $150 and buy it"; after turn 1
  the user opens d2 (black silk, $249) — the agent must not buy the wrong dress.
- **T7 cart-audit / augmenting-heavy:** "make sure exactly the red wrap dress is in the cart, then
  check out"; the user meanwhile adds d4 — the agent must detect and remove it, and must NOT
  undo deliberate user action without asking (behavioral attribution probe).
- **T9 why-question:** after mixed activity: "why is the cart total what it is?" — scored against
  the causal slice.

## 6. Outputs

Every episode writes `results/<run-id>/<task>_<substrate>_<level>_<seed>.json`: full transcript,
per-request usage, every FireResult, the session's transitions + commit log, probe answers, verdicts.
Aggregation scripts recompute all paper numbers from these files only.
