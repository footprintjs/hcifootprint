---
title: ActionProgress
---

# Interface: ActionProgress

Defined in: [src/action/types.ts:423](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L423)

Retained and live progress for one exact transition.

## Methods

### snapshot()

> **snapshot**(): [`ActionProgressSnapshot`](/api/index/type-aliases/ActionProgressSnapshot)

Defined in: [src/action/types.ts:424](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L424)

#### Returns

[`ActionProgressSnapshot`](/api/index/type-aliases/ActionProgressSnapshot)

***

### subscribe()

> **subscribe**(`listener`): () => `void`

Defined in: [src/action/types.ts:426](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L426)

Immediately replays the current snapshot, then streams changes until closed.

#### Parameters

##### listener

(`snapshot`) => `void`

#### Returns

() => `void`
