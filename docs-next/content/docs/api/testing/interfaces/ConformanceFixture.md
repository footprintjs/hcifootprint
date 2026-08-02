---
title: ConformanceFixture
---

# Interface: ConformanceFixture

Defined in: [src/testing/conform.ts:176](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/conform.ts#L176)

The declaration `conformSource` feeds through a source, plus a ready-made input
per source kind. Handed to the BUILDER form, which is how a source under test
receives a declaration the helper already knows by heart.

## Properties

### action

> **action**: [`FullActionDef`](/api/testing/type-aliases/FullActionDef)

Defined in: [src/testing/conform.ts:186](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/conform.ts#L186)

Every declarable field, populated with a distinguishable sentinel.

***

### actionId

> **actionId**: `string`

Defined in: [src/testing/conform.ts:184](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/conform.ts#L184)

The fixture action's qualified id on the compiled graph (`page.name`).

***

### destination

> **destination**: `string`

Defined in: [src/testing/conform.ts:180](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/conform.ts#L180)

A second page, so the fixture's `goTo` names a destination that really exists.

***

### journeyId

> **journeyId**: `string`

Defined in: [src/testing/conform.ts:203](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/conform.ts#L203)

The journey id in [ConformanceFixture.journeys](/api/testing/interfaces/ConformanceFixture#journeys).

***

### journeys

> **journeys**: `Record`\<`string`, [`JourneyDef`](/api/index/interfaces/JourneyDef)\>

Defined in: [src/testing/conform.ts:201](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/conform.ts#L201)

A journey list whose one journey steps through the fixture action — for a journeys source.

***

### name

> **name**: `string`

Defined in: [src/testing/conform.ts:182](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/conform.ts#L182)

The fixture action's leaf name.

***

### page

> **page**: `string`

Defined in: [src/testing/conform.ts:178](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/conform.ts#L178)

The page the fixture action lives on.

***

### routeObjects

> **routeObjects**: readonly [`RouteObjectLike`](/api/index/interfaces/RouteObjectLike)[]

Defined in: [src/testing/conform.ts:199](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/conform.ts#L199)

The same two pages as a nested route TREE — for a route-tree source
(`fromReactRouter`). DERIVED from [ConformanceFixture.routes](/api/testing/interfaces/ConformanceFixture#routes) rather
than written out again, so the two inputs cannot describe different pages:
each route carries its label in the handle and lets the factory transcribe
the page name from the address, which is exactly the round-trip the routes
seam then reads back.

***

### routes

> **routes**: `Record`\<`string`, \{ `does`: `string`; `route`: `string`; \}\>

Defined in: [src/testing/conform.ts:190](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/conform.ts#L190)

A route table naming both fixture pages — for a routes source.

***

### state

> **state**: `Record`\<`string`, `unknown`\>

Defined in: [src/testing/conform.ts:210](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/conform.ts#L210)

The projected state that puts every field where the library promises to serve
it: the guard PASSES (so the row is offered at all) and `enabledWhen` FAILS
(so the row is switched off, the only condition under which a blocked sentence
is ever served).

***

### store

> **store**: [`LiveActionStore`](/api/index/interfaces/LiveActionStore)

Defined in: [src/testing/conform.ts:188](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/conform.ts#L188)

A live action store publishing exactly the fixture action — for a live source.
