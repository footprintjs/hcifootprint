---
title: LiveActionStore
---

# Interface: LiveActionStore

Defined in: [src/graph/sources/types.ts:98](https://github.com/footprintjs/hcifootprint/blob/main/src/graph/sources/types.ts#L98)

The smallest respectable store contract — subscribe + read-current, the
shape React itself blesses (useSyncExternalStore). Any app store that can
say "here are my actions now" and "something changed" satisfies it.

## Methods

### actions()

> **actions**(): [`LiveAction`](/api/index/interfaces/LiveAction)[]

Defined in: [src/graph/sources/types.ts:100](https://github.com/footprintjs/hcifootprint/blob/main/src/graph/sources/types.ts#L100)

#### Returns

[`LiveAction`](/api/index/interfaces/LiveAction)[]

***

### subscribe()

> **subscribe**(`onChange`): () => `void`

Defined in: [src/graph/sources/types.ts:99](https://github.com/footprintjs/hcifootprint/blob/main/src/graph/sources/types.ts#L99)

#### Parameters

##### onChange

() => `void`

#### Returns

() => `void`
