# `src/contextful` — contextful actions (D21)

**One wrapper at registration, and both directions of one action land in the same
record.**

```ts
const addToCart = contextful(shop.add, { watch: true, anchor: () => buttonRef.current });

session.registerActions('catalog', { handlers: { 'add-to-cart': addToCart } });
// the agent's door:  session.fire('catalog.add-to-cart', { source: 'agent' })
// the human's door:  <button onClick={() => addToCart({ qty: 2 })}>
```

The agent's call already went through `fire()`, so the session captures around
it. The human's call never did — the app called its own function — so the
wrapper reports it record-only and then runs the function exactly as before.
**The anchor is bidirectional: it actuates for the agent and senses for the
record.**

## The files

| file | one job |
|---|---|
| `contextful.ts` | the wrapper, the brand it carries, and `contextful.sense()` |
| `anchor.ts` | the watcher: anchor-scoped listeners, one observer, the correlation window, the budgets |
| `anchor-port.ts` | the DOM, declared structurally — no global is ever named |
| `capture.ts` | the envelope's assembly, and where law 1 is enforced |
| `types.ts` | the vocabulary, with the four laws written where they are kept |

## How the session knows

**A brand on the function.** The registry is deliberately session-blind and
stores plain handlers, so the declaration travels on the handler itself under a
non-enumerable symbol. `Session.bindHandler` — the one door every registration
path funnels through — reads it to bind the site and attach the anchor;
`fire()` reads it again to know what to capture. No new registration option, no
parallel table to keep in step, and the opt-in stays visible in the app's own
source.

## What it may keep

Key NAMES and event TYPES. A value crosses only through the app's `include`
allowlist and only after the app's own `redact` has seen it. The port itself
cannot read content — there is no `textContent` and no `value` on it — so the
boundary law is a surface that does not exist rather than a rule to remember.

## What it will not claim

Sensing is stamped `inferred` and carries the correlation rule on the record:
*an event or change delivered between the fire and the end of the task it came
to rest in.* An anchor may say an effect was `'observed'` only when the app's
OWN declared expectation matched a change the library actually saw — and
value-correctness stays out of scope. Nothing here checks that what appeared was
right.

See `docs/design/d21-contextful-actions.md` for the spec and
`test/contextful-laws.test.ts` for the four laws, one describe each.
