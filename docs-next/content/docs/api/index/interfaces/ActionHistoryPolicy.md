---
title: ActionHistoryPolicy
---

# Interface: ActionHistoryPolicy

Defined in: [src/action/types.ts:845](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L845)

How much settled history the runtime keeps. `keep` counts FULLY settled
transitions (both rails terminal); past it the oldest are released, the
way `forgetTransition` would. A pending row is never counted and never
released.

## Properties

### keep

> `readonly` **keep**: `number`

Defined in: [src/action/types.ts:846](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L846)
