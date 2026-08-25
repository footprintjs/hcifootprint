---
title: checkActionContracts
---

# Function: checkActionContracts()

> **checkActionContracts**(`declarations`, `environment`): [`ActionContractReport`](/api/testing/interfaces/ActionContractReport)

Defined in: [src/action/contracts.ts:270](https://github.com/footprintjs/hcifootprint/blob/main/src/action/contracts.ts#L270)

Classify every activation clause modeled by the supplied runtime, binding,
and evidence snapshots, plus capabilities explicitly requested by binding
rows. `ok` covers only the checks this function emits. In particular,
input-schema activation belongs to ActionRuntime and is not modeled here.

## Parameters

### declarations

readonly [`ActionContractDeclaration`](/api/testing/interfaces/ActionContractDeclaration)\<`string`\>[]

### environment

[`ActionContractEnvironment`](/api/testing/interfaces/ActionContractEnvironment)

## Returns

[`ActionContractReport`](/api/testing/interfaces/ActionContractReport)
