# Live Desk

A support inbox whose actions do not exist in the graph.

The graph in this demo declares **places** — two pages, two tabs, a blocking compose
modal, a repeating ticket row — and not a single tool. Every action arrives at runtime
from the app's own action store, read in by `fromLiveStore`. Hide a control and its
action stops existing. Reach for a gesture nobody wired and the refusal names the
gesture. Nothing in the right-hand column is written by hand: every number, marker,
refusal and receipt is rendered from a live API return value, and each panel header
names the call it came from.

```bash
npm run build --prefix ../..   # the demo links hcifootprint from the repo root
npm install
npm run dev                    # http://localhost:5173
npm test                       # the demo's own suite
npm run verify                 # typecheck + tests + production build
```

No key is needed. The assistant runs a scripted model whose answers are assembled from
the desk's real tool results, so `npm run dev` and `npm test` behave identically every
time and nothing leaves the tab. Paste an Anthropic or OpenAI key in the chat panel and
the same tools, the same session and the same panels are driven by a real model instead.

## What to try

1. **"Reply to Priya's ticket about the refund."** The desk renders 12 rows; Priya's
   ticket is `t-51`, past the 50-key cap `available()` puts on a served instance list.
   The agent asks the desk which ticket that is, fires the row by id, and it works —
   the cap caps what is *shown*, never what can be *done*.
2. **"Switch to the archive tab."** The desk has tabs. Nobody wired a function to flip
   them. The fire comes back `NOT_MATERIALIZED` carrying the gesture
   (`{kind: 'tab', target: 'desk.archive'}`), and the backlog panel clusters it as
   *tab · NOT_MATERIALIZED* — a work item addressed to whoever owns that control.
3. **Settings → Tab switch wired.** Now the same ask performs, the tab really flips,
   and the page cursor does not move: flipping a tab is not going somewhere. The app's
   own wiring reports the result with `show()`; `fire()` never writes presence.
4. **Settings → Compose button off.** The action disappears from the graph, because the
   control that performs it stopped rendering.
5. **`detachSources()`** empties the surface; the button beside it re-attaches the same
   source through the direct door, `fromLiveStore(store).attach(session)`.
6. **Reply to a ticket, then archive it.** Before the reply, the row's archive button is
   greyed and an agent fire is refused `TOOL_DISABLED`. Per-row truth has no home in
   projected state, so it rides the channel built for it: `enabled`.

## How it is put together

| file | what it is |
|---|---|
| `src/app/tickets.ts` | 60 deterministic tickets; `t-51` is the one past the render cap |
| `src/app/state.ts` | the desk's state and command vocabulary — no hcifootprint import |
| `src/app/actions.ts` | the action catalogue: a pure function of *what is on screen right now* |
| `src/app/store.ts` | `DeskStore` — subscribe + read-current, the shape React itself blesses |
| `src/desk/graph.ts` | `buildNavigationGraph` — places only, `sources: [fromLiveStore(store)]` |
| `src/desk/projection.ts` | the lean state the guards and the instance selector read |
| `src/desk/wiring.ts` | the whole seam: sync / show / setVisible / updateState |
| `src/agent/bridge.ts` | Mode B (`serveToAgent`) handed to an agentfootprint Agent |
| `src/agent/mockScript.ts` | the scripted model — every sentence derived from a real result |
| `src/panels/*.ts` | pure derivations: the rack, the backlog clusters, the receipts |
| `src/ui/*` | the app surface and the panel wall |

Three details worth knowing, because they are the ones that bite:

**A handler is bound at first sight and stays bound.** `fromLiveStore` reconciles by
identity key (`node.name[instance]`) and never re-registers an unchanged one — that is
what keeps a chatty store from spamming the registry. So every handler in
`app/actions.ts` closes over the stable `commands` object and reads live state through
it, and changing an action's *wiring* (the Settings toggle) publishes two snapshots:
gone, then back. `store.ts` calls that the rebind protocol, and `store.test.ts` pins it.

**An action's existence follows its control.** `useControl` is one line per component,
and it is the only registration anywhere in this app.

**Markers describe the action id.** A ticket row is wired per instance
(`…reply-to-ticket[t-51]`), which the bare id knows nothing about — so a rows-only
action reads `materialized: false` on the rack while its rows fire perfectly. The demo
prints that unimproved and lets per-row truth arrive where it is actually known: in the
fire's own result. Dressing it up would be the app asserting something the session never
returned, which is the one thing this demo may not do.

## The suite

`npm test` — 8 files. The load-bearing ones:

- `app/store.test.ts` — chatty reads, control-driven publication, per-row `enabled`, the
  rebind protocol, and that a captured handler acts on the desk *as it is now*.
- `desk/wiring.test.ts` — the chatty store moves nothing (no warnings, no structure
  bumps); a real change moves it exactly once; `TOOL_DISABLED` → answered → performs;
  the tab gesture refused, then wired, then performed with the cursor unmoved; the fire
  past the render cap; detach / re-attach; the modal masking; the guard refusal with its
  evidence.
- `panels/panels.test.ts` — a marker whose field was absent is not rendered.
- `agent/chat.test.ts` — the scripted agent end to end: it replies to the ticket it was
  never shown, reports a refusal as a refusal, performs once the app wires the gesture,
  and refuses to clear the archive without a human saying yes.
