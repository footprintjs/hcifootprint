# guarded-wizard — the guarded-journey pattern, runnable

A three-page project wizard whose journey steps sit behind guards, whose Next button is
greyed rather than hidden, whose every step declares the app's own check that it really
happened, and whose route table doubles as the spine that keeps every page reachable.

```bash
npm run example:wizard                              # print the transcript
npx vitest run examples/guarded-wizard              # the proofs
```

No API key, no network, no model — the only moving part is the app.

| File | One job |
| --- | --- |
| `app.ts` | the APP: store, router, handlers. Imports nothing from the library |
| `graph.ts` | the graph: the route table + journey list as sources, the actions by hand |
| `wire.ts` | the four additive lines — `navigate`, two `registerActions`, two taps |
| `run.ts` | one real run, printed. The docs page is written from this output |
| `guarded-journey.test.ts` | every claim the docs page makes, asserted (Convention 2) |

One bug in `app.ts` is deliberate: `pickRecipe` given an id the app does not have selects
nothing, returns normally, and still notifies its store. That is the field failure the whole
example is built around — a handler that RAN is not an action that HAPPENED, and only the
app's own `verify` contract can tell the difference.

The pattern is written up on [Guarded journeys](https://footprintjs.github.io/hcifootprint/docs/map/guarded-journeys).
It is ONE reference implementation, not the only way to hold these pieces together.
