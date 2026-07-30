---
title: WatchOptions
---

# Interface: WatchOptions

Defined in: [src/sensor/types.ts:69](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L69)

## Properties

### cadence?

> `optional` **cadence?**: [`Cadence`](/api/sensor/type-aliases/Cadence)

Defined in: [src/sensor/types.ts:139](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L139)

The watcher's default cadence for value-bearing controls. Default `'commit'`
— commit-on-blur. A declaration may override it per control. See
[Cadence](/api/sensor/type-aliases/Cadence).

***

### now?

> `optional` **now?**: () => `number`

Defined in: [src/sensor/types.ts:87](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L87)

The clock coverage() reports its window with. Defaults to Date.now.

#### Returns

`number`

***

### onReport?

> `optional` **onReport?**: (`report`) => `void`

Defined in: [src/sensor/types.ts:78](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L78)

Every fire, and every non-fire, as a typed row. See [SensorReport](/api/sensor/type-aliases/SensorReport).

#### Parameters

##### report

[`SensorReport`](/api/sensor/type-aliases/SensorReport)

#### Returns

`void`

***

### reportedElsewhere?

> `optional` **reportedElsewhere?**: readonly `string`[]

Defined in: [src/sensor/types.ts:113](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L113)

"Does the app already report these edges itself?" — ONE ACT, ONE ROW.

An app mid-migration still has hand-wired report calls for some controls (a
humanFire wrapper in its own onClick). Both doors firing means two ledger
rows for one human act. Name those edges here and the sensor stands down for
them, saying so in coverage() with `blocked: 'door'` rather than going quiet.

Read ONCE, at watchPage: a list that changed under a live watcher would
silently re-open edges the app is still reporting for itself, which is the
double-row bug this option exists to prevent.

It is the ONE per-edge option the sensor accepts, it applies to BOTH evidence
levels, and it is not instrumentation: it tells the sensor nothing about how
to find anything. It draws a boundary between two reporters. Delete the app's
own door and delete this with it. (It is also exactly the stand-down list a
future one-door control would register itself on.)

***

### root

> **root**: [`SensorRoot`](/api/sensor/interfaces/SensorRoot)

Defined in: [src/sensor/types.ts:76](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L76)

The event-delegation root. REQUIRED, and required in the core on purpose:
the house law is that the app hands the environment in and the library never
reaches for a global. A framework skin supplies the browser default; the
core never invents one.

***

### timers?

> `optional` **timers?**: [`SensorTimers`](/api/sensor/interfaces/SensorTimers)

Defined in: [src/sensor/types.ts:94](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L94)

The clock a `{ debounceMs }` cadence runs on. Defaults to the root's own view
(dom-port.ts `timersOf`); pass it explicitly for a test or a non-browser
host. With no clock reachable, a debounced cadence is REFUSED
(`cadence-unavailable`), never quietly downgraded to per-keystroke.

***

### trust?

> `optional` **trust?**: (`event`) => `boolean`

Defined in: [src/sensor/types.ts:85](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L85)

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

Defined in: [src/sensor/types.ts:133](https://github.com/footprintjs/hcifootprint/blob/main/src/sensor/types.ts#L133)

Watch the view for location motion and report it with `sync()`. **Default
false**, and the default is the honest one.

`sync()` takes a PAGE ID, and page ids are author-chosen names, not URL paths
(from-routes.ts:4 — "Page names are EXPLICIT (the keys of the table)"). A
watcher that handed `location.pathname` to `sync()` unasked would, in every
app whose pages are named rather than pathed, move the cursor to a node that
does not exist — and `sync()` moves it unconditionally. From there
`available()` honestly serves nothing, so the sensor AND the app's whole
agent surface go quiet, silently, because a convenience was on by default.

Turn it on when your page ids ARE your paths. Otherwise own the mapping the
way route-match.ts:13 already shows, which is one line:

```ts
session.sync(matchRoute(graph.spec.pages, location.pathname) ?? location.pathname);
```
