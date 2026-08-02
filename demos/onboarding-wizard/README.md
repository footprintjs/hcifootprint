# Onboarding wizard — the graph grows from what the app already had

A five-page signup wizard. Its navigation graph is not typed out by hand: it is **grown** from the two
descriptions the app already owned — a route table and a journey list — and its navigation has
**no handlers at all**.

```bash
npm install
npm run dev      # http://localhost:5173, no key needed
npm run verify   # typecheck + tests + production build
```

Everything runs on a deterministic scripted model by default. `npm run dev` and `npm test` need no
API key, no network, and behave identically every time. A key flips the same code path to a live
model — see [Bring your own key](#bring-your-own-key).

## What this demo is for

Three claims, each demonstrated live rather than described:

**1. The graph reads the app's truth instead of copying it.**
[`src/app/routes.ts`](src/app/routes.ts) is an ordinary route table; the app's router navigates by
it. [`src/app/journeys.ts`](src/app/journeys.ts) is an ordinary list of onboarding funnels.
[`src/app/graph.ts`](src/app/graph.ts) hands both to the compiler:

```ts
buildNavigationGraph('onboarding', {
  sources: [fromRoutes(ROUTES), fromJourneys(JOURNEYS)],
  pages: HAND_PAGES,   // what the route table cannot know: which actions live where
});
```

The merge order is one sentence, printed in the docs and enforced in code:

> Pages first (routes then hand-authored, hand-authored wins), journeys overlay second and may only
> add, live actions attach last and only bind — nothing later in the order may remove anything
> earlier. Routes may also contribute link actions; hand-authored actions win.

The **sources panel** shows what that produced as a set difference over the compiled graph, and then
proves the sources are load-bearing by compiling two throwaway graphs on the spot: the same
hand-authored blocks with no sources (it refuses — `done` is a page only the route table knows
about), and one page declared at two addresses (it refuses — drift made visible). Both refusals are
printed in the library's own words.

**2. Navigation needs no handlers, so there are none.**
Every `goTo`-only tool in [`src/app/pages.ts`](src/app/pages.ts) — `to-profile`, `to-plan`,
`to-review`, and the three `back-to-*` — has no handler anywhere. They work because the session was
handed the app's own router:

```ts
graph.createSession({ node: 'welcome', state, navigate: (href) => router.push(href) });
```

The session derives a literal address from the target page's route and performs the gesture through
that function. The category of glue this deletes is the fake do-nothing handler, registered purely
to get a navigation past `NOT_MATERIALIZED`.
[`test/no-fake-handlers.test.ts`](test/no-fake-handlers.test.ts) proves it both ways: the app
registers handlers for exactly the four tools that change something, and withholding the `navigate`
option refuses the identical fire.

A click is not an address, and the library never pretends otherwise: `welcome.import-from-google`
declares an element gesture, nothing is wired to it, and firing it is refused with the gesture
riding the refusal — "this is a click on the *Import from Google* button", not "nothing is bound".

**3. A journey that could never act is never opened.**
`import-signup` starts with that unwired click. Press **Try to commit as the agent** on it and the
gate refuses `ENTRY_NOT_MATERIALIZED`, naming the step and the missing wiring, opening no frame,
touching no state, and landing exactly one row in the demand backlog. Meanwhile page actions stay
reachable while a journey IS open — including the way back — so the traveler is never trapped.

## Watch the agent do it

Press a starter prompt. The assistant reads `whats_here`, unlocks the journey, walks the wizard
page by page, fills the profile from your own words in the shape the app advertised, and then
**stops** at the high-effect step with the receipts it was handed. It creates nothing until you say
yes.

Its tools are the library's Mode B surface — one tool per journey plus three fixed generics
(`whats_here`, `do_action`, `why`) — and that array never changes for the life of the conversation.
Disclosure rides the result channel instead, which is what keeps a prompt cache warm.

## No panel states a fact the session did not return

Every number, marker, refusal and receipt on the right is read off a live return value, and each
panel carries a chip naming the call it came from:

| Panel | Rendered from |
| --- | --- |
| What the sources contributed | `graph.spec.pages` / `graph.spec.journeys`, diffed against the app's literals |
| What is possible here | `session.available()` |
| Journeys, and whether they can start | `session.availableJourneys()` + `session.available()` |
| Receipts | `session.transitions()` + `session.commitLog()` |
| Demand backlog | `session.gaps()` |
| URL round-trip | `matchRoute(graph.spec.pages, path) ?? path` |

The receipts panel keeps three truths apart because the library does: whether the record committed,
whether the **declared writes were actually observed**, and whether a cursor move is still only a
claim. The URL panel lets you type any path and shows exactly what the app would do with it —
including the `??` arm, where a path the matcher cannot place is handed to `sync()` raw and recorded
off-graph rather than resolved to the nearest-looking page.

## How it is put together

Everything with behaviour is DOM-free and lives under `src/app` and `src/panels`; React is a view
over it. That is why the whole suite runs in plain node and why a browser can never disagree with a
test — both drive the same object.

| File | One job |
| --- | --- |
| `src/app/routes.ts` | the route table, the single owner of every address |
| `src/app/journeys.ts` | the journey list, in the library's own `does`/`steps`/`when` vocabulary |
| `src/app/pages.ts` | the hand-authored blocks: which actions live on which page |
| `src/app/graph.ts` | the three-line compile |
| `src/app/store.ts` | the app's data, and the lean projection guards read |
| `src/app/router.ts` | twenty lines, no dependencies — this is what `navigate` calls |
| `src/app/mounts.ts` | one page's handlers at a time |
| `src/app/wizard.ts` | the four connections that make it an app |
| `src/panels/*` | pure projections of live return values |
| `src/agent/*` | the Mode B bridge, the scripted model, the providers |
| `src/keys/keyStore.ts` | the only module that touches a key |

## Bring your own key

Pick Anthropic or OpenAI in the Model dropdown and paste a key. It goes into
`sessionStorage` for this tab only, is read once at provider construction, and is sent directly to
the provider's host — it reaches no backend, because this app has none. **Forget my keys** wipes
every slot from both storages. No `VITE_*` environment variable is ever read: Vite would inline one
into the built bundle and publish it to every visitor.

The live model runs the same tools, the same session and the same panels. Only who answers changes.
