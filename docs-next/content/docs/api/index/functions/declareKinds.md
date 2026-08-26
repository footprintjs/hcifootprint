---
title: declareKinds
---

# Function: declareKinds()

> **declareKinds**(...`contributions`): [`DeclaredKindCatalog`](/api/index/interfaces/DeclaredKindCatalog)

Defined in: [src/action/kinds.ts:114](https://github.com/footprintjs/hcifootprint/blob/main/src/action/kinds.ts#L114)

Build the default catalog from one or more CONTRIBUTIONS — separate
objects so teams own their files and the runtime owns the merge. One
kind declared twice is a REFUSAL naming both contributions, never a
silent last-writer-wins: one catalog, one meaning per name, and the
second declaration is exactly the collision governance exists to catch.

## Parameters

### contributions

...readonly `Readonly`\<`Record`\<`string`, [`KindDeclaration`](/api/index/interfaces/KindDeclaration)\>\>[]

## Returns

[`DeclaredKindCatalog`](/api/index/interfaces/DeclaredKindCatalog)
