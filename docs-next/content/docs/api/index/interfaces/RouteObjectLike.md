---
title: RouteObjectLike
---

# Interface: RouteObjectLike

Defined in: src/graph/sources/from-react-router.ts:61

A route as every React-Router-shaped config writes one — structural, so the
real `RouteObject` of v6 and of v7 both satisfy it and neither is imported.

Only these four keys are ever read. A router puts much more on a route
(`element`, `Component`, `lazy`, `loader`, `action`, `errorElement`, …) and
every one of them is about RENDERING, which the graph does not describe; they
are left off this type rather than accepted-and-dropped, so what the library
reads is legible from the type alone.

## Properties

### children?

> `optional` **children?**: readonly `RouteObjectLike`[]

Defined in: src/graph/sources/from-react-router.ts:67

Nested routes. Their addresses compose through this one's.

***

### handle?

> `optional` **handle?**: `unknown`

Defined in: src/graph/sources/from-react-router.ts:74

The router's own free-form slot. This library reads exactly one key inside
it — `hcifootprint` — and inside THAT, exactly `name` and `does`. Typed
`unknown` because it is somebody else's field: every app puts its own things
there, and a narrower type would refuse a route table that is perfectly fine.

***

### index?

> `optional` **index?**: `boolean`

Defined in: src/graph/sources/from-react-router.ts:65

True for the route that renders at its parent's address. Folds into the parent's page.

***

### path?

> `optional` **path?**: `string`

Defined in: src/graph/sources/from-react-router.ts:63

The route's own path — relative to its parent, or absolute if it starts with '/'.
