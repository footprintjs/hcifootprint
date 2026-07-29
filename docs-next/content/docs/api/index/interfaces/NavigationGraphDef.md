---
title: NavigationGraphDef
---

# Interface: NavigationGraphDef

Defined in: [src/tree/types.ts:87](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L87)

## Properties

### does?

> `optional` **does?**: `string`

Defined in: [src/tree/types.ts:88](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L88)

***

### pages

> **pages**: `Record`\<`string`, [`PageNodeDef`](/api/index/interfaces/PageNodeDef)\>

Defined in: [src/tree/types.ts:89](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L89)

***

### skills?

> `optional` **skills?**: `Record`\<`string`, [`SkillDef2`](/api/index/interfaces/SkillDef2)\>

Defined in: [src/tree/types.ts:92](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L92)

***

### sources?

> `optional` **sources?**: readonly [`GraphSource`](/api/index/type-aliases/GraphSource)[]

Defined in: [src/tree/types.ts:107](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L107)

Growable inputs the app ALREADY owns — fromRoutes(app.routes) seeds pages,
fromJourneys(app.journeys) seeds skills, fromLiveStore(app.actionStore)
attaches live bindings per session. Static sources fold into this def
BEFORE the compiler's walk, under ONE documented order:

  "Pages first (routes then hand-authored, hand-authored wins), journeys
   overlay second and may only add, live actions attach last and only
   bind — nothing later in the order may remove anything earlier."

Deterministic on purpose: nothing later in the order can remove anything
earlier, so a traveler can trust the floor under their feet. A def without
sources compiles exactly as before this field existed.

***

### tools?

> `optional` **tools?**: `Record`\<`string`, [`ToolDef`](/api/index/interfaces/ToolDef) & `object`\>

Defined in: [src/tree/types.ts:91](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L91)

Root-level multi-attach tools: offered on several PAGES at once.
