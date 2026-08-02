---
title: FullActionDef
---

# Type Alias: FullActionDef

> **FullActionDef** = [`RegisteredActionDef`](/api/index/interfaces/RegisteredActionDef) & `Partial`\<`NonNullable`\<[`NavigationGraphDef`](/api/index/interfaces/NavigationGraphDef)\[`"actions"`\]\>\[`string`\]\>

Defined in: src/testing/conform.ts:94

Everything an action declaration may carry: `ActionDef` PLUS its two extension
points — the root-level multi-attach `on` (a graph definition's own `actions:`
block) and the mount-time `handler` (`RegisteredActionDef`). Derived from both
rather than re-typed, so a field added at either door lands here by itself.
