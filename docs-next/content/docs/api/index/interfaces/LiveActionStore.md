---
title: LiveActionStore
---

# Interface: LiveActionStore

Defined in: [src/graph/sources/types.ts:88](https://github.com/footprintjs/hcifootprint/blob/main/src/graph/sources/types.ts#L88)

The smallest respectable store contract — subscribe + read-current, the
shape React itself blesses (useSyncExternalStore). Any app store that can
say "here are my actions now" and "something changed" satisfies it.

## Methods

### actions()

> **actions**(): [`LiveAction`](/api/index/interfaces/LiveAction)[]

Defined in: [src/graph/sources/types.ts:90](https://github.com/footprintjs/hcifootprint/blob/main/src/graph/sources/types.ts#L90)

#### Returns

[`LiveAction`](/api/index/interfaces/LiveAction)[]

***

### subscribe()

> **subscribe**(`onChange`): () => `void`

Defined in: [src/graph/sources/types.ts:89](https://github.com/footprintjs/hcifootprint/blob/main/src/graph/sources/types.ts#L89)

#### Parameters

##### onChange

() => `void`

#### Returns

() => `void`
