# tree/ — the navigation graph authoring surface (D18)

One job: turn the semantic container tree a consumer already holds in their
head — pages → areas / tabs / modals → actions — into (a) a validated, frozen
tree index and (b) a **flat projection** every existing layer runs on
unchanged.

```ts
const graph = buildNavigationGraph('shop', {
  pages: {
    catalog: {
      areas: { 'filter-rail': { actions: { 'set-color': { does: 'Filter dresses by color' } } } },
      actions: { 'add-to-cart': { does: 'Add the dress to the cart', when: { authenticated: { eq: true } } } },
    },
  },
  journeys: { purchase: { does: 'Buy a dress', steps: ['add-to-cart'] } },
});
const session = graph.createSession(); // an InteractionSession
```

Design rules:

- **`does:` is one authored string with two readers** — the consumer's intent
  label IS the agent's tool description (firewall by construction).
- **Exactly three authored semantics**: `modals` (overlay masking, `blocks:
  false` for popovers), `tabs` (at-most-one-shown prior — NOT a statechart),
  `repeats` (template + instance keys). Everything else is descriptive.
- **An action needs only `does`** to exist in the plannable spine; binding,
  guard, handler, schema may materialize at mount (the adoption-ladder floor).
- **Container `when` AND-composes root→leaf** into descendant action guards;
  children can only narrow — conflicts die at compile time.
- **Qualified dot paths are identity** (`checkout.confirm-order.place-order`);
  journeys may reference steps by unambiguous suffix, resolved (or failed
  loudly) at `buildNavigationGraph()` time.
- **Two authoring keys, one word each**: `actions:` for controls, `journeys:`
  for named flows. The renamed spellings (`tools:`, `skills:`) are refused by
  name at `tree/authoring-keys.ts`, never silently ignored.

Tests: `test/appmap.test.ts`. Spec: `docs/design/d18-navigation-graph.md`.
