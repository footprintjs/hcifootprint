# react — one skin over the framework-neutral core

**Job:** `useActionBinding` — the React-idiomatic way to connect a declared action to a mounted component: publish committed facts, retire on unmount, advance the binding generation when committed input changes.

**Depends on:** `action/` (the whole protocol lives there — this folder adds React lifecycle glue and nothing else).
**Used by:** applications. Never imported by any core module.

**This hook is sugar, not the seam.** It is composed entirely from public primitives — `connectAction`, `connection.update()`, `connection.attach()`, the `ActionHostAdapter` contract. A consumer who wants different React semantics (signals, an external store, Suspense-aware publication) — or a Vue or Solid integration — writes their own skin against the same primitives, with zero changes here. The dependency-free Angular test (`test/angular-action-binding.test.ts`) proves the core needs no framework, and is the template for proving a skin of your own.

**There is deliberately no `strategy` option on this hook.** A strategy parameter inside a skin would be a second extension point duplicating the seam the core already is — and two ways to customize one behaviour eventually disagree. One seam, many worlds: the same reasoning as the kind catalog and the host adapter.

## The skin contract — four laws, each paid for

1. **Publish only after commit.** An abandoned render must never become readable by a live connection.
2. **Advance the generation when committed input changes.** Otherwise an offer minted against the previous committed props can be invoked reading the newer input — violating *what was offered is what was invoked*. This shipped as a real defect in THIS hook before it was a written law.
3. **Retire on unmount and on revision change.** An offer must never name a control that stopped existing.
4. **Never hold "the current transition".** Press twice quickly and a stored current lets the second settlement land on the first record.

Full page with a worked example: `docs-next/content/docs/actions/bring-your-own-skin.mdx`.
