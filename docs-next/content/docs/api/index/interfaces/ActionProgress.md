---
title: ActionProgress
---

# Interface: ActionProgress

Defined in: [src/action/types.ts:484](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L484)

Retained and live progress for one exact transition.

## Methods

### snapshot()

> **snapshot**(): [`ActionProgressSnapshot`](/api/index/type-aliases/ActionProgressSnapshot)

Defined in: [src/action/types.ts:485](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L485)

#### Returns

[`ActionProgressSnapshot`](/api/index/type-aliases/ActionProgressSnapshot)

***

### subscribe()

> **subscribe**(`listener`): () => `void`

Defined in: [src/action/types.ts:487](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L487)

Immediately replays the current snapshot, then streams changes until closed.

#### Parameters

##### listener

(`snapshot`) => `void`

#### Returns

() => `void`
