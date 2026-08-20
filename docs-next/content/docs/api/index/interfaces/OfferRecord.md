---
title: OfferRecord
---

# Interface: OfferRecord

Defined in: [src/atom/types.ts:1466](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1466)

WHAT WAS TRUE WHEN THAT ROW WAS SERVED — the session-local record an
[OfferRef](/api/index/interfaces/OfferRef) points at, read back with `session.offerFor(offerId)`.

APPEND-ONLY. A record is written once and never rewritten. Serving the same
action again under an unchanged world hands back the SAME `offerId`, because
it is the same offer — the facts below are the offer's identity, so two
records can never disagree about one id, and one id can never quietly come to
mean something else.

BOUNDED, AND SAID SO. A session retains a fixed number of these and drops the
oldest when it is full (`session.offersDropped()` counts them, and the first
eviction warns the integrator once — where citations are required, which is
the only place a dropped one costs anything). A fire citing an id that was dropped is
refused as `OFFER_NOT_ON_RECORD` with `why: 'evicted'` — never answered as if
the citation had been checked, and never confused with an id this session
never minted (`why: 'unknown'`).

## Extends

- [`OfferRef`](/api/index/interfaces/OfferRef)

## Properties

### actionId

> **actionId**: `string`

Defined in: [src/atom/types.ts:1439](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1439)

The action this row was for.

#### Inherited from

[`OfferRef`](/api/index/interfaces/OfferRef).[`actionId`](/api/index/interfaces/OfferRef#actionid)

***

### guardEvaluated

> **guardEvaluated**: `string`[]

Defined in: [src/atom/types.ts:1477](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1477)

Guard keys the session could evaluate when it served the row.

***

### guardUnevaluated

> **guardUnevaluated**: `string`[]

Defined in: [src/atom/types.ts:1479](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1479)

Guard keys it could NOT — served anyway, with the marker, and recorded as such.

***

### node

> **node**: `string`

Defined in: [src/atom/types.ts:1441](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1441)

The page the cursor was on when it was served.

#### Inherited from

[`OfferRef`](/api/index/interfaces/OfferRef).[`node`](/api/index/interfaces/OfferRef#node)

***

### offerId

> **offerId**: `string`

Defined in: [src/atom/types.ts:1437](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1437)

This offer's id, unique within the session. Cite it as [FireOptions.offerId](/api/index/interfaces/FireOptions#offerid).

#### Inherited from

[`OfferRef`](/api/index/interfaces/OfferRef).[`offerId`](/api/index/interfaces/OfferRef#offerid)

***

### servedAt

> **servedAt**: `number`

Defined in: [src/atom/types.ts:1468](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1468)

When this offer was FIRST served (epoch ms). Never rewritten by a later serve.

***

### staleReads

> **staleReads**: `string`[]

Defined in: [src/atom/types.ts:1481](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1481)

Declared reads this session was already carrying an unanswered staleness for.

***

### staleWrites

> **staleWrites**: `string`[]

Defined in: [src/atom/types.ts:1483](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1483)

Declared writes this session was already carrying an unanswered staleness for.

***

### stateVersion

> **stateVersion**: `number`

Defined in: [src/atom/types.ts:1443](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1443)

The app's state version at serve time — the anchor "what has moved since?" is asked from.

#### Inherited from

[`OfferRef`](/api/index/interfaces/OfferRef).[`stateVersion`](/api/index/interfaces/OfferRef#stateversion)

***

### structureVersion

> **structureVersion**: `number`

Defined in: [src/atom/types.ts:1445](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1445)

The served-surface version at serve time (mounts, frames, enablement flips).

#### Inherited from

[`OfferRef`](/api/index/interfaces/OfferRef).[`structureVersion`](/api/index/interfaces/OfferRef#structureversion)

***

### version

> **version**: `number`

Defined in: [src/atom/types.ts:1475](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1475)

The cursor version at first serve — what `keysChangedSince` is asked with
when a fire cites this offer. Older than a re-serve's cursor by design: no
state key can be committed without `stateVersion` moving, and a moved
`stateVersion` is a different offer, so the two windows name the same keys.
