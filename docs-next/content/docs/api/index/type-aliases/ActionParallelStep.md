---
title: ActionParallelStep
---

# Type Alias: ActionParallelStep

> **ActionParallelStep** = `Omit`\<[`ActionPlanStep`](/api/index/interfaces/ActionPlanStep), `"carry"`\> & `object`

Defined in: [src/action/walk.ts:75](https://github.com/footprintjs/hcifootprint/blob/main/src/action/walk.ts#L75)

Independent calls selected by the caller; one item cannot consume another
item's output. Node labels alone never establish parallel safety.

## Type Declaration

### carry?

> `readonly` `optional` **carry?**: `never`
