---
title: WatchOptions
---

# Interface: WatchOptions

Defined in: src/sensor/types.ts:65

## Properties

### now?

> `optional` **now?**: () => `number`

Defined in: src/sensor/types.ts:83

The clock coverage() reports its window with. Defaults to Date.now.

#### Returns

`number`

***

### onReport?

> `optional` **onReport?**: (`report`) => `void`

Defined in: src/sensor/types.ts:74

Every non-fire, and every fire, as a typed row. See [SensorReport](/api/sensor/type-aliases/SensorReport).

#### Parameters

##### report

[`SensorReport`](/api/sensor/type-aliases/SensorReport)

#### Returns

`void`

***

### reportedElsewhere?

> `optional` **reportedElsewhere?**: readonly `string`[]

Defined in: src/sensor/types.ts:98

"Does the app already report this edge itself?" — ONE ACT, ONE ROW.

An app that is mid-migration still has hand-wired report calls for some
controls (a humanFire wrapper in its own onClick). Both doors firing means
two ledger rows for one human act. Name those edges here and the sensor
stands down for them, saying so in coverage() with `blocked: 'door'` rather
than going quiet.

This is the ONE per-edge option the sensor accepts, and it is not
instrumentation: it tells the sensor nothing about how to find anything. It
draws a boundary between two reporters. Delete the app's own door and delete
this with it.

***

### root

> **root**: [`SensorRoot`](/api/sensor/interfaces/SensorRoot)

Defined in: src/sensor/types.ts:72

The event-delegation root. REQUIRED, and required in the core on purpose:
the house law is that the app hands the environment in and the library never
reaches for a global. A framework skin supplies the browser default; the
core never invents one.

***

### trust?

> `optional` **trust?**: (`event`) => `boolean`

Defined in: src/sensor/types.ts:81

"Was a human really here?" Defaults to reading `event.isTrusted`, which only
a real user gesture sets. Injectable because a test harness can never mint a
trusted event — the same injectable-with-production-default seam as
`now?: () => number` at nav-session.ts:65.

#### Parameters

##### event

[`SensorEvent`](/api/sensor/interfaces/SensorEvent)

#### Returns

`boolean`

***

### watchLocation?

> `optional` **watchLocation?**: `boolean`

Defined in: src/sensor/types.ts:119

Watch the view for location motion and report it with `sync()`. **Default
false**, and the default is the honest one.

`sync()` takes a PAGE ID, and page ids are author-chosen names, not URL paths
(from-routes.ts:54 — "Page names are EXPLICIT... auto-deriving a name from
'/orders/:id' would be a guess"). A watcher that handed `location.pathname`
to `sync()` unasked would, in every app whose pages are named rather than
pathed, move the cursor to a node that does not exist — and `sync()` moves it
unconditionally (session.ts:1661-1692). From there `available()` honestly
serves nothing, so the sensor AND the app's whole agent surface go quiet,
silently, because a convenience was on by default.

Turn it on when your page ids ARE your paths. Otherwise own the mapping the
way route-match.ts:16 already shows, which is one line:

```ts
session.sync(matchRoute(graph.spec.pages, location.pathname) ?? location.pathname);
```
