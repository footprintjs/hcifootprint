---
title: skillGraph
---

# Function: skillGraph()

> **skillGraph**(`id`, `opts?`): [`SkillGraphBuilder`](/api/index/classes/SkillGraphBuilder)

Defined in: [src/graph/builder.ts:44](https://github.com/footprintjs/hcifootprint/blob/main/src/graph/builder.ts#L44)

hcifootprint — turn a web app's interaction surface into a typed,
traversable skill graph an LLM can plan over.

The frontend sibling of footprintjs (backend flowcharts) and agentfootprint
(self-explaining agents): one self-explaining trace substrate underneath.

```ts
import { buildNavigationGraph } from 'hcifootprint';

const graph = buildNavigationGraph('shop', {
  pages: {
    catalog: {
      tools: {
        'add-to-cart': { does: 'Add the open dress to the cart', when: { authenticated: { eq: true } }, writes: ['cart'] },
      },
    },
  },
  skills: { purchase: { does: 'Buy a dress end to end', steps: ['add-to-cart'] } },
});

const session = graph.createSession({ node: 'catalog', state: { authenticated: true } });
session.available();                        // → guard-passing edges = the LLM's action space
session.registerToolGroup('catalog', { handlers: { 'add-to-cart': (i) => shop.add(i) } });
session.fire('catalog.add-to-cart', { source: 'agent' });  // → settlement: 'awaiting-state'
session.updateState({ cart: 1 });           // your store tap settles the pending write
session.why('cart');                        // footprint backward slice over the session

// v1 skillGraph() — the fluent builder — remains as legacy sugar.
```

## Parameters

### id

`string`

### opts?

#### description?

`string`

## Returns

[`SkillGraphBuilder`](/api/index/classes/SkillGraphBuilder)
