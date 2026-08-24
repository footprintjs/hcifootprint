---
title: ActionContractReport
---

# Interface: ActionContractReport

Defined in: src/action/contracts.ts:168

## Properties

### bindingsChecked

> `readonly` **bindingsChecked**: `number`

Defined in: src/action/contracts.ts:174

***

### byDisposition

> `readonly` **byDisposition**: `Readonly`\<`Record`\<[`ActionContractDisposition`](/api/testing/type-aliases/ActionContractDisposition), readonly [`ActionContractResult`](/api/testing/interfaces/ActionContractResult)[]\>\>

Defined in: src/action/contracts.ts:177

***

### conclusive

> `readonly` **conclusive**: `boolean`

Defined in: src/action/contracts.ts:172

False whenever at least one contract could not be decided from the snapshot.

***

### contracts

> `readonly` **contracts**: readonly [`ActionContractResult`](/api/testing/interfaces/ActionContractResult)[]

Defined in: src/action/contracts.ts:175

***

### counts

> `readonly` **counts**: `Readonly`\<`Record`\<[`ActionContractDisposition`](/api/testing/type-aliases/ActionContractDisposition), `number`\>\>

Defined in: src/action/contracts.ts:176

***

### declarationsChecked

> `readonly` **declarationsChecked**: `number`

Defined in: src/action/contracts.ts:173

***

### ok

> `readonly` **ok**: `boolean`

Defined in: src/action/contracts.ts:170

True only when every contract is active or intentionally disclosure-only.

***

### summary

> `readonly` **summary**: `string`

Defined in: src/action/contracts.ts:180
