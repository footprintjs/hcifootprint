---
title: ConformanceFixture
---

# Interface: ConformanceFixture

Defined in: [src/testing/conform.ts:173](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/conform.ts#L173)

The declaration `conformSource` feeds through a source, plus a ready-made input
per source kind. Handed to the BUILDER form, which is how a source under test
receives a declaration the helper already knows by heart.

## Properties

### action

> **action**: [`FullActionDef`](/api/testing/type-aliases/FullActionDef)

Defined in: [src/testing/conform.ts:183](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/conform.ts#L183)

Every declarable field, populated with a distinguishable sentinel.

***

### actionId

> **actionId**: `string`

Defined in: [src/testing/conform.ts:181](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/conform.ts#L181)

The fixture action's qualified id on the compiled graph (`page.name`).

***

### destination

> **destination**: `string`

Defined in: [src/testing/conform.ts:177](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/conform.ts#L177)

A second page, so the fixture's `goTo` names a destination that really exists.

***

### journeyId

> **journeyId**: `string`

Defined in: [src/testing/conform.ts:191](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/conform.ts#L191)

The journey id in [ConformanceFixture.journeys](/api/testing/interfaces/ConformanceFixture#journeys).

***

### journeys

> **journeys**: `Record`\<`string`, [`JourneyDef`](/api/index/interfaces/JourneyDef)\>

Defined in: [src/testing/conform.ts:189](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/conform.ts#L189)

A journey list whose one journey steps through the fixture action — for a journeys source.

***

### name

> **name**: `string`

Defined in: [src/testing/conform.ts:179](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/conform.ts#L179)

The fixture action's leaf name.

***

### page

> **page**: `string`

Defined in: [src/testing/conform.ts:175](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/conform.ts#L175)

The page the fixture action lives on.

***

### routes

> **routes**: `Record`\<`string`, \{ `does`: `string`; `route`: `string`; \}\>

Defined in: [src/testing/conform.ts:187](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/conform.ts#L187)

A route table naming both fixture pages — for a routes source.

***

### state

> **state**: `Record`\<`string`, `unknown`\>

Defined in: [src/testing/conform.ts:198](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/conform.ts#L198)

The projected state that puts every field where the library promises to serve
it: the guard PASSES (so the row is offered at all) and `enabledWhen` FAILS
(so the row is switched off, the only condition under which a blocked sentence
is ever served).

***

### store

> **store**: [`LiveActionStore`](/api/index/interfaces/LiveActionStore)

Defined in: [src/testing/conform.ts:185](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/conform.ts#L185)

A live action store publishing exactly the fixture action — for a live source.
