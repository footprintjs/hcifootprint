---
title: SkillGraphBuilder
---

# Class: SkillGraphBuilder

Defined in: [src/graph/builder.ts:48](https://github.com/footprintjs/hcifootprint/blob/main/src/graph/builder.ts#L48)

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

## Constructors

### Constructor

> **new SkillGraphBuilder**(`id`, `description?`): `SkillGraphBuilder`

Defined in: [src/graph/builder.ts:55](https://github.com/footprintjs/hcifootprint/blob/main/src/graph/builder.ts#L55)

#### Parameters

##### id

`string`

##### description?

`string`

#### Returns

`SkillGraphBuilder`

## Methods

### affordance()

> **affordance**(`id`, `def`): `this`

Defined in: [src/graph/builder.ts:67](https://github.com/footprintjs/hcifootprint/blob/main/src/graph/builder.ts#L67)

#### Parameters

##### id

`string`

##### def

[`AffordanceDef`](/api/index/interfaces/AffordanceDef)

#### Returns

`this`

***

### build()

> **build**(): [`SkillGraph`](/api/index/interfaces/SkillGraph)

Defined in: [src/graph/builder.ts:137](https://github.com/footprintjs/hcifootprint/blob/main/src/graph/builder.ts#L137)

#### Returns

[`SkillGraph`](/api/index/interfaces/SkillGraph)

***

### page()

> **page**(`id`, `def?`): `this`

Defined in: [src/graph/builder.ts:61](https://github.com/footprintjs/hcifootprint/blob/main/src/graph/builder.ts#L61)

#### Parameters

##### id

`string`

##### def?

[`PageDef`](/api/index/interfaces/PageDef) = `{}`

#### Returns

`this`

***

### skill()

> **skill**(`id`, `def`): `this`

Defined in: [src/graph/builder.ts:117](https://github.com/footprintjs/hcifootprint/blob/main/src/graph/builder.ts#L117)

#### Parameters

##### id

`string`

##### def

[`SkillDef`](/api/index/interfaces/SkillDef)

#### Returns

`this`
