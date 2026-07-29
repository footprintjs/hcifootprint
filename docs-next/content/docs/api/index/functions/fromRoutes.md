---
title: fromRoutes
---

# Function: fromRoutes()

> **fromRoutes**\<`R`\>(`routes`): [`RoutesSource`](/api/index/interfaces/RoutesSource)\<keyof `R` & `string`\>

Defined in: [src/graph/sources/from-routes.ts:26](https://github.com/footprintjs/hcifootprint/blob/main/src/graph/sources/from-routes.ts#L26)

Read a route table into a RoutesSource. Two value shapes per page:
a bare route string, or `{ route, does }` when the page deserves a label.

The `const` type parameter preserves the literal page names, so the compiled
graph's session methods accept them as typed node paths.

## Type Parameters

### R

`R` *extends* `Record`\<`string`, `string` \| \{ `does?`: `string`; `route`: `string`; \}\>

## Parameters

### routes

`R`

## Returns

[`RoutesSource`](/api/index/interfaces/RoutesSource)\<keyof `R` & `string`\>
