---
title: NavigationGraphDef
---

# Interface: NavigationGraphDef

Defined in: [src/tree/types.ts:105](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L105)

## Properties

### does?

> `optional` **does?**: `string`

Defined in: [src/tree/types.ts:106](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L106)

***

### pages?

> `optional` **pages?**: `Record`\<`string`, [`PageNodeDef`](/api/index/interfaces/PageNodeDef)\>

Defined in: [src/tree/types.ts:115](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L115)

Hand-authored pages. Optional since sources exist: a def whose whole
spine comes from `fromRoutes(...)` is the headline use case, and forcing
`pages: {}` on it was one line of pure boilerplate. Requiredness lives
where it means something — the build-time refusal judges the EFFECTIVE
graph (hand pages + sources folded), so a def with neither still dies
loudly with "has no pages".

***

### skills?

> `optional` **skills?**: `Record`\<`string`, [`JourneyDef`](/api/index/interfaces/JourneyDef)\>

Defined in: [src/tree/types.ts:119](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L119)

Named multi-step flows: the journeys this graph can be planned over.

***

### sources?

> `optional` **sources?**: readonly [`GraphSource`](/api/index/type-aliases/GraphSource)[]

Defined in: [src/tree/types.ts:135](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L135)

Growable inputs the app ALREADY owns — fromRoutes(app.routes) seeds pages,
fromJourneys(app.journeys) seeds skills, fromLiveStore(app.actionStore)
attaches live bindings per session. Static sources fold into this def
BEFORE the compiler's walk, under ONE documented order:

  "Pages first (routes then hand-authored, hand-authored wins), journeys
   overlay second and may only add, live actions attach last and only
   bind — nothing later in the order may remove anything earlier. Routes
   may also contribute link tools; hand-authored tools win."

Deterministic on purpose: nothing later in the order can remove anything
earlier, so a traveler can trust the floor under their feet. A def without
sources compiles exactly as before this field existed.

***

### tools?

> `optional` **tools?**: `Record`\<`string`, [`ToolDef`](/api/index/interfaces/ToolDef) & `object`\>

Defined in: [src/tree/types.ts:117](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L117)

Root-level multi-attach tools: offered on several PAGES at once.
