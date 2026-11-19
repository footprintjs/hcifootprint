---
title: fromRoutes
---

# Function: fromRoutes()

> **fromRoutes**\<`R`\>(`routes`, `options?`): [`RoutesSource`](/api/index/interfaces/RoutesSource)\<keyof `R` & `string`\>

Defined in: [src/graph/sources/from-routes.ts:47](https://github.com/footprintjs/hcifootprint/blob/main/src/graph/sources/from-routes.ts#L47)

Read a route table into a RoutesSource. Two value shapes per page:
a bare route string, or `{ route, does }` when the page deserves a label.

The `const` type parameter preserves the literal page names, so the compiled
graph's session methods accept them as typed node paths.

`crossLinks` turns pages into navigation actions offered everywhere else:
- `true` — every page in this table whose route is FULLY LITERAL. A blanket
  ask meets the literal-address law as a documented FILTER: a ':param' page
  is skipped, because the library never guesses what to put in the param and
  a half-address is not an address.
- a named subset — only those pages, and now every name is answered for: an
  unknown name refuses, and a ':param' route refuses. An explicit ask earns
  a loud refusal where a blanket one earns a filter.

The option is recorded as the REQUEST, not as tools: which pages a link is
offered ON is "every page in the effective graph except the target", and the
effective graph (this table PLUS the def's hand-authored pages) is a set only
mergeSources can see. This factory reads one table and refuses to pretend
otherwise.

## Type Parameters

### R

`R` *extends* `Record`\<`string`, `string` \| \{ `does?`: `string`; `route`: `string`; \}\>

## Parameters

### routes

`R`

### options?

#### crossLinks?

`true` \| readonly keyof `R` & `string`[]

## Returns

[`RoutesSource`](/api/index/interfaces/RoutesSource)\<keyof `R` & `string`\>
