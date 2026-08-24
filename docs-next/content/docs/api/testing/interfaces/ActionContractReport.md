---
title: ActionContractReport
---

# Interface: ActionContractReport

Defined in: [src/action/contracts.ts:165](https://github.com/footprintjs/hcifootprint/blob/main/src/action/contracts.ts#L165)

## Properties

### bindingsChecked

> `readonly` **bindingsChecked**: `number`

Defined in: [src/action/contracts.ts:171](https://github.com/footprintjs/hcifootprint/blob/main/src/action/contracts.ts#L171)

***

### byDisposition

> `readonly` **byDisposition**: `Readonly`\<`Record`\<[`ActionContractDisposition`](/api/testing/type-aliases/ActionContractDisposition), readonly [`ActionContractResult`](/api/testing/interfaces/ActionContractResult)[]\>\>

Defined in: [src/action/contracts.ts:174](https://github.com/footprintjs/hcifootprint/blob/main/src/action/contracts.ts#L174)

***

### conclusive

> `readonly` **conclusive**: `boolean`

Defined in: [src/action/contracts.ts:169](https://github.com/footprintjs/hcifootprint/blob/main/src/action/contracts.ts#L169)

False whenever at least one contract could not be decided from the snapshot.

***

### contracts

> `readonly` **contracts**: readonly [`ActionContractResult`](/api/testing/interfaces/ActionContractResult)[]

Defined in: [src/action/contracts.ts:172](https://github.com/footprintjs/hcifootprint/blob/main/src/action/contracts.ts#L172)

***

### counts

> `readonly` **counts**: `Readonly`\<`Record`\<[`ActionContractDisposition`](/api/testing/type-aliases/ActionContractDisposition), `number`\>\>

Defined in: [src/action/contracts.ts:173](https://github.com/footprintjs/hcifootprint/blob/main/src/action/contracts.ts#L173)

***

### declarationsChecked

> `readonly` **declarationsChecked**: `number`

Defined in: [src/action/contracts.ts:170](https://github.com/footprintjs/hcifootprint/blob/main/src/action/contracts.ts#L170)

***

### ok

> `readonly` **ok**: `boolean`

Defined in: [src/action/contracts.ts:167](https://github.com/footprintjs/hcifootprint/blob/main/src/action/contracts.ts#L167)

True only when every emitted activation check is active or disclosure-only.

***

### summary

> `readonly` **summary**: `string`

Defined in: [src/action/contracts.ts:177](https://github.com/footprintjs/hcifootprint/blob/main/src/action/contracts.ts#L177)
