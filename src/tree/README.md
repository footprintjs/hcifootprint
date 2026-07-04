# tree/ — the navigation graph authoring surface (D18)

One job: turn the semantic container tree a consumer already holds in their
head — pages → areas / tabs / modals → tools — into (a) a validated, frozen
tree index and (b) a **flat projection** every existing layer runs on
unchanged.

```ts
const graph = buildNavigationGraph('shop', {
  pages: {
    catalog: {
      areas: { 'filter-rail': { tools: { 'set-color': { does: 'Filter dresses by color' } } } },
      tools: { 'add-to-cart': { does: 'Add the dress to the cart', when: { authenticated: { eq: true } } } },
    },
  },
  skills: { purchase: { does: 'Buy a dress', steps: ['add-to-cart'] } },
});
const session = graph.createSession(); // an InteractionSession
```

Design rules:

- **`does:` is one authored string with two readers** — the consumer's intent
  label IS the agent's tool description (firewall by construction).
- **Exactly three authored semantics**: `modals` (overlay masking, `blocks:
  false` for popovers), `tabs` (at-most-one-shown prior — NOT a statechart),
  `repeats` (template + instance keys). Everything else is descriptive.
- **A tool needs only `does`** to exist in the plannable spine; binding,
  guard, handler, schema may materialize at mount (the adoption-ladder floor).
- **Container `when` AND-composes root→leaf** into descendant tool guards;
  children can only narrow — conflicts die at compile time.
- **Qualified dot paths are identity** (`checkout.confirm-order.place-order`);
  skills may reference steps by unambiguous suffix, resolved (or failed
  loudly) at `buildNavigationGraph()` time.
- The v1 fluent `skillGraph()` stays forever as the one-level sugar; both
  surfaces share the same guard-enforcement spine (`graph/guards.ts`).

Tests: `test/appmap.test.ts`. Spec: `docs/design/d18-navigation-graph.md`.
