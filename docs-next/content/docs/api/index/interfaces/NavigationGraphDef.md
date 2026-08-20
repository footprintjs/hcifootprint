---
title: NavigationGraphDef
---

# Interface: NavigationGraphDef

Defined in: [src/tree/types.ts:347](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L347)

## Properties

### actions?

> `optional` **actions?**: `Record`\<`string`, [`ActionDef`](/api/index/interfaces/ActionDef) & `object`\>

Defined in: [src/tree/types.ts:359](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L359)

Root-level multi-attach actions: offered on several PAGES at once.

***

### does?

> `optional` **does?**: `string`

Defined in: [src/tree/types.ts:348](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L348)

***

### journeys?

> `optional` **journeys?**: `Record`\<`string`, [`JourneyDef`](/api/index/interfaces/JourneyDef)\>

Defined in: [src/tree/types.ts:361](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L361)

Named multi-step flows: the journeys this graph can be planned over.

***

### pages?

> `optional` **pages?**: `Record`\<`string`, [`PageNodeDef`](/api/index/interfaces/PageNodeDef)\>

Defined in: [src/tree/types.ts:357](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L357)

Hand-authored pages. Optional since sources exist: a def whose whole
spine comes from `fromRoutes(...)` is the headline use case, and forcing
`pages: {}` on it was one line of pure boilerplate. Requiredness lives
where it means something — the build-time refusal judges the EFFECTIVE
graph (hand pages + sources folded), so a def with neither still dies
loudly with "has no pages".

***

### sources?

> `optional` **sources?**: readonly [`GraphSource`](/api/index/type-aliases/GraphSource)[]

Defined in: [src/tree/types.ts:377](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L377)

Growable inputs the app ALREADY owns — fromRoutes(app.routes) seeds pages,
fromJourneys(app.journeys) seeds journeys, fromLiveStore(app.actionStore)
attaches live bindings per session. Static sources fold into this def
BEFORE the compiler's walk, under ONE documented order:

  "Pages first (routes then hand-authored, hand-authored wins), journeys
   overlay second and may only add, live actions attach last and only
   bind — nothing later in the order may remove anything earlier. Routes
   may also contribute link actions; hand-authored actions win."

Deterministic on purpose: nothing later in the order can remove anything
earlier, so a traveler can trust the floor under their feet. A def without
sources compiles exactly as before this field existed.
