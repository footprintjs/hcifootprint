# hcifootprint — feature-work map

Turns a web app's interaction surface into a typed, traversable journey graph an LLM can
plan over. You author **actions** and name **journeys**; a **tool** is what is served to a
model. One authored sentence (`does`) is both the human's label and the model's tool
description. Everything relational — routes between pages, which action unblocks which — is
**derived from declarations made for other reasons**, never authored. **Trust the code**
where any doc disagrees.

**The vocabulary (1.10.0):** you declare the JourneyMap; the session is the Walker; the
recording carries both. `defineJourneyMap`/`JourneyMap` are permanent reference-equal aliases of
`buildNavigationGraph`/`NavigationGraph` (tree/appmap.ts) — both names ship forever, neither is a
rename, and there is deliberately NO `Walker` export: the walker is the session. Three movers move
it — **human** (a real click, `principal: 'user'`), **agent** (the four served verbs `whats_here` /
`why` / `do_action` / `did_it_work`), **guard** (your data: `when`/`enabledWhen`) — plus the world's
own `Cause.kind: 'stimulus'`. Same pattern at three altitudes: footprintjs walks stages,
agentfootprint (`defineSkillMap`) walks skills, this walks screens.

**Position has three tiers, one door each (1.11.0):** page (`sync`) → container
(`observeFocus`, new) → state (`updateState`, not position). **Sync pages; observe the deeper place.
`sync()` moves the walker and decides what is served; `observeFocus()` says which tab or area the
reader is in. Declare containers, and report the deepest one on screen.** The middle door had to
exist: actions are served from the PAGE, so a cursor on a tab is served nothing (a container path to
`sync` now syncs its page and warns, naming `observeFocus` — before 1.11.0 it went off-graph
silently), and `focus` moved only on `fire()`/`sync()`, so a PERSON clicking a tab could never move
it. `observeFocus` (traverse/nav-session.ts) sets `focus` + the new `lookingAt` getter (served beside
`youAreOn` by modes.ts `positionData`), records a `FocusMove`, and touches NOTHING else — no
transition, no version bump, no change to `available()`. It refuses BY NAME: undeclared node, or a
node on another page. Three facts, three doors: `show()`/`setVisible()` = VISIBLE,
`observeFocus()` = the READER, `sync()` = the WALKER. Authored half lintable
(`unevidenceable-tab`, advisory); the runtime half no static check can see.

## Before you design it: it may already exist

**Read this table before proposing any new capability.** Everything below already ships.
The failure it exists to stop is real and expensive: a reader searches for the words THEY
would use, finds nothing, and designs a feature this library has had for releases. It
happened three times in one day — twice here. Someone proposed "bind actions by role and
name instead of CSS selectors", and `ElementLocator` had been exactly `{ role, name }`
since the first npm release. Someone proposed inventing a vocabulary for what moved the
cursor, and `Cause` + `Principal` had been sitting in the same file, one screen apart.
Each cost a design round.

Keyed by **what you would call it**, not by what it is called here. If your idea is not in
this table, search `src/index.ts` for the nearest noun before writing code.

| If you are about to build… | It is | Where | Since |
|---|---|---|---|
| declaring the app's journey map — the official, family-wide name for the authoring door | `defineJourneyMap` + `JourneyMap` (permanent reference-equal aliases of `buildNavigationGraph` / `NavigationGraph`) | `src/tree/appmap.ts` | 1.10.0 |
| a Walker class to construct, so the agent has something to hold — there is none, on purpose: the walker IS the session | `InteractionSession` | `src/traverse/nav-session.ts` | 1.0.0 |
| binding an action to a real control by role and accessible name, instead of a CSS selector | `ElementLocator` (one arm of `Binding`, alongside `keychord` / `programmatic` / `url` / `tab`) | `src/atom/types.ts` | 0.2.0 |
| a vocabulary for who caused a move — a person, the agent, or the world moving on its own | `Cause` + `Principal` + `StimulusKind` | `src/atom/types.ts` | 0.2.0 |
| grading what a "who did this" is actually worth — watched, matched, or nobody said | `Attribution` + `AttributionBasis` + `AttributionCertainty` | `src/atom/types.ts` | 1.7.0 |
| recording who moved the cursor, including when it did not move | `InteractionSession.focusHistory` + `FocusMove` | `src/traverse/nav-session.ts` | 1.8.0 |
| tracking which tab is active — telling the agent WHERE INSIDE the page the person is, without moving what is served | `InteractionSession.observeFocus` + `lookingAt` (the deepest-node rule: sync pages, observe the deeper place) | `src/traverse/nav-session.ts` | 1.11.0 |
| working out why the ledger says “system unknown changed: …” instead of naming what happened | `updateState` + `sync` (an unattributed state report has no stimulus and no principal to print — name them, or report position AS position; state-key labels are not built) | `src/traverse/session.ts` | 1.11.0 |
| walking the fewest declared hops from here to some page | `Session.howToReach` / `routeBetween` + `RouteStep` | `src/graph/reach.ts` | 1.0.0 |
| deriving which action would unblock another one | `Session.whatUnblocks` / `unblockingDependencies` | `src/graph/step-deps.ts` | 1.0.0 |
| turning a URL your router already owns back into a page id | `matchRoute` | `src/graph/route-match.ts` | 0.4.0 |
| serving a model only what is reachable from where the cursor stands, with a tool list whose bytes never change | `serveToAgent` | `src/serve/modes.ts` | 1.0.0 |
| a way for a model to abandon a journey it committed to | `leaveJourneyTool` | `src/serve/mcp.ts` | 1.0.0 |
| narrowing what is served to the steps of one flow, and tracking that pass at it | `JourneyFrame` (opened by `Session.commitJourney`) | `src/atom/types.ts` | 1.0.0 |
| making a caller's string safe as a tool name without two names folding into one | `encodeToolName` | `src/serve/tool-name.ts` | 1.8.0 |
| telling the agent why a control is off, and who can clear it | `BlockedBecause` | `src/atom/types.ts` | 1.2.0 |
| saying who may fire an action, whose choice it is, and whether a yes is required | `PrincipalPolicy` / `checkPrincipalPolicy` | `src/traverse/principal-policy.ts` | 1.7.0 |
| refusing an agent's bare claim that "the user approved" — a yes must POINT at a decision a person recorded | `checkApproval` | `src/traverse/approval-gate.ts` | 0.7.0 |
| showing a person what they are about to approve | `ConfirmReceipts` | `src/atom/types.ts` | 0.3.0 |
| saying a choice is the person's to make, not the agent's | `HumanDecides` | `src/atom/types.ts` | 1.3.0 |
| computing an element's accessible name so a click can be recognised | `computeAccessibleName` + `normalizeName` | `src/sensor/accessible-name.ts` | 0.8.0 |
| recording every human click without a report call in every `onClick` | `watchPage` (record-only by type: `RecordOnlyFire`) | `src/sensor/watch-page.ts` | 0.8.0 |
| one wrapper so the app's OWN call and the agent's fire land in the same record | `contextful` | `src/contextful/contextful.ts` | 1.6.0 |
| hiding a secret inside a payload rather than a whole state key | `redactFields` + `REDACTED` | `src/traverse/redact-fields.ts` | 0.8.0 |
| a ledger of what the agent could NOT do | `GapRecord` (written by `Session.reportGap`) | `src/atom/types.ts` | 0.2.0 |
| asking why a piece of state holds the value it holds — the footprintjs backward slice, over the session's own commit log | `Session.why` | `src/traverse/session.ts` | 0.2.0 |
| a CI gate that catches a graph that has drifted from the app | `lintGraph` + `checkGraph` | `src/testing/` | 0.2.0 |
| a headless test that drives the REAL session as a user or as the agent | `testApp` | `src/testing/harness.ts` | 0.2.0 |
| proving a graph SOURCE adapter does not silently drop a declared field | `conformSource` | `src/testing/conform.ts` | 1.4.0 |
| adopting a route table, a journey list or a live action store you already have | `fromRoutes` + `fromJourneys` + `fromLiveStore` | `src/graph/sources/` | 0.5.0 |
| seeding the page spine from a router's own nested route tree | `fromReactRouter` | `src/graph/sources/from-react-router.ts` | 1.5.0 |

**The honest limit, said plainly.** This table can go stale by OMISSION — nothing cheap
forces a new capability to add a row, so absence from it is weak evidence, and
`src/index.ts` remains the authority. What it can never do is LIE about what it names:
`test/docs/capability-index.test.ts` fails if any row points at a path that does not exist
or names a symbol that is not there. A row that has rotted is worse than no row, because
it costs the reader the same search plus a wrong turn.

**Maintaining it:** a new public capability adds a row. Phrase the first column as the
sentence someone would say who does not know the symbol exists — that is the whole
mechanism; a row keyed on the library's own noun is findable only by people who already
found it.

## Module map

Entry points: `hcifootprint` (authoring + session) · `/mcp` (the only place the MCP SDK is
imported) · `/sensor` · `/react` · `/testing` · `/testing/lint` (engine-free static lint).

| src/ | one job |
|---|---|
| atom/ | the domain types, layer 0. `Affordance = binding × guard × effect × schema`; `Transition = cause × payload × outcome`. No runtime code. |
| graph/ | the authoring spine every graph door throws through (guards, segments, routes) + `matchRoute`, `reach`, `step-deps`, and the growable `sources/` |
| tree/ | `buildNavigationGraph` — pages → areas / tabs / modals → actions, validated, frozen, plus the flat projection every other layer runs on |
| traverse/ | the driver. `Session` / `InteractionSession`: one settled transition → one fresh StageContext → one footprintjs `CommitBundle`, so `causalChain`/`sliceForKey` work with zero new query code |
| registry/ | what is wired RIGHT NOW: `affordanceId → the app's real handler`, in groups so unmount cleanup is one call |
| presence/ | refcounted mount handles + explicit visibility signals, as plain data. What presence MEANS lives one layer up |
| serve/ | LLM-facing emission: MCP descriptors, `serveToAgent` (journeys as fixed tools), the tool-name encoder |
| sensor/ | the record-only human sensor (`hcifootprint/sensor`). Zero-value-import leaf |
| react/ | a skin over the sensor — a context and two hooks, nothing else. The only folder naming `react` |
| contextful/ | one wrapper at registration, so both doors into an action land in the same capture envelope |
| testing/ | static `lintGraph`/`checkGraph`, dynamic `testApp`, and `conformSource` for adapter drift |

## Gates

```bash
npm run typecheck        # tsc --noEmit, plus the test tsconfig
npm test                 # vitest, then the posttest badge gate (README's count must match the run)
npm run docs:truth:check # does the shipped surface still have the docs the baseline recorded?
npm run build            # dist/, ESM-first — docs:truth reads dist, so build before it
```

The README states a test COUNT, and `scripts/check-test-badge.mjs` fails if the badge or
its alt text disagrees with the run. Adding tests means editing BOTH numbers in
`README.md` — a number nobody checks is not a fact.
