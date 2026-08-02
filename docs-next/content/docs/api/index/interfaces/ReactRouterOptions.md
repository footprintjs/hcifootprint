---
title: ReactRouterOptions
---

# Interface: ReactRouterOptions

Defined in: src/graph/sources/from-react-router.ts:133

## Properties

### crossLinks?

> `optional` **crossLinks?**: `true` \| readonly `string`[]

Defined in: src/graph/sources/from-react-router.ts:154

Turn these pages into navigation actions offered everywhere else — the same
option, the same two stances and the same refusals as
[fromRoutes](/api/index/functions/fromRoutes): `true` takes every page of THIS tree whose route is
fully literal (a documented FILTER — a ':param' page is skipped, because a
half-address is not an address), while a named subset answers for every name
(an unknown name refuses, and so does a ':param' route).

Names here are PAGE ids — the ones this factory derived or the route
declared — not paths, because the graph's own vocabulary is page ids.

***

### nameOf?

> `optional` **nameOf?**: (`route`, `absolutePath`) => `string` \| `undefined`

Defined in: src/graph/sources/from-react-router.ts:142

Name a route the transcription cannot — or override one it can.

Called once per route that contributes an ADDRESS (never for a layout route,
which is not a place), with the route object itself and the absolute path
composed for it. Return a name to use it; return `undefined` to fall through
to `handle.hcifootprint.name`, then to the transcription, then to a refusal.

#### Parameters

##### route

[`RouteObjectLike`](/api/index/interfaces/RouteObjectLike)

##### absolutePath

`string`

#### Returns

`string` \| `undefined`
