---
title: fromReactRouter
---

# Function: fromReactRouter()

> **fromReactRouter**(`routes`, `opts?`): [`RoutesSource`](/api/index/interfaces/RoutesSource)

Defined in: src/graph/sources/from-react-router.ts:193

Read a router's own route tree into a RoutesSource — a frozen snapshot of the
app's truth, pages only.

THE DERIVATION, exactly (and it is the whole contract):

1. ADDRESSES COMPOSE THROUGH CHILDREN. A child's `path` extends its parent's
   address, unless it starts with '/' — which every router reads as absolute,
   so it REPLACES the inherited prefix rather than doubling it. The composed
   address is stored canonically ('/projects/new'), which is what `matchRoute`
   and the merge read it back as.
2. A LAYOUT ROUTE IS NOT A PLACE. A route with no `path` of its own (and not
   an index route) contributes NO page; it only passes its parent's address
   down to its children. Declaring `handle.hcifootprint` on one is refused —
   a page is an address, and a layout has none of its own.
3. INDEX ROUTES FOLD INTO THEIR PARENT. `index: true` means "renders at my
   parent's address", so it contributes that same address — and two routes at
   ONE address are ONE page (`path: ''` folds identically, the other spelling
   of the same idea). The fold combines their declarations; two folded routes
   declaring DIFFERENT names refuse, because that is one place with two names.
4. THE NAME. `nameOf` first (it is the call-site override), then
   `handle.hcifootprint.name` (a literal on the route the app owns), then the
   TRANSCRIPTION — the address's segments joined with '-', so '/' + no
   segments and any dynamic segment are exactly the cases that cannot be
   transcribed and refuse instead, naming the path and both doors.
5. NAMES ARE UNIQUE. Two different addresses arriving at one page id refuse,
   naming both paths. Never last-wins: a silently-swallowed page is a place an
   agent can never be told about.

## Parameters

### routes

readonly [`RouteObjectLike`](/api/index/interfaces/RouteObjectLike)[]

### opts?

[`ReactRouterOptions`](/api/index/interfaces/ReactRouterOptions)

## Returns

[`RoutesSource`](/api/index/interfaces/RoutesSource)

## Example

```ts
const source = fromReactRouter(app.routes, {
  nameOf: (route, path) => (path === '/' ? 'home' : undefined),
});
```
