---
title: OfferRecord
---

# Interface: OfferRecord

Defined in: [src/atom/types.ts:1442](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1442)

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

Defined in: [src/atom/types.ts:1415](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1415)

The action this row was for.

#### Inherited from

[`OfferRef`](/api/index/interfaces/OfferRef).[`actionId`](/api/index/interfaces/OfferRef#actionid)

***

### guardEvaluated

> **guardEvaluated**: `string`[]

Defined in: [src/atom/types.ts:1453](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1453)

Guard keys the session could evaluate when it served the row.

***

### guardUnevaluated

> **guardUnevaluated**: `string`[]

Defined in: [src/atom/types.ts:1455](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1455)

Guard keys it could NOT — served anyway, with the marker, and recorded as such.

***

### node

> **node**: `string`

Defined in: [src/atom/types.ts:1417](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1417)

The page the cursor was on when it was served.

#### Inherited from

[`OfferRef`](/api/index/interfaces/OfferRef).[`node`](/api/index/interfaces/OfferRef#node)

***

### offerId

> **offerId**: `string`

Defined in: [src/atom/types.ts:1413](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1413)

This offer's id, unique within the session. Cite it as [FireOptions.offerId](/api/index/interfaces/FireOptions#offerid).

#### Inherited from

[`OfferRef`](/api/index/interfaces/OfferRef).[`offerId`](/api/index/interfaces/OfferRef#offerid)

***

### servedAt

> **servedAt**: `number`

Defined in: [src/atom/types.ts:1444](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1444)

When this offer was FIRST served (epoch ms). Never rewritten by a later serve.

***

### staleReads

> **staleReads**: `string`[]

Defined in: [src/atom/types.ts:1457](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1457)

Declared reads this session was already carrying an unanswered staleness for.

***

### staleWrites

> **staleWrites**: `string`[]

Defined in: [src/atom/types.ts:1459](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1459)

Declared writes this session was already carrying an unanswered staleness for.

***

### stateVersion

> **stateVersion**: `number`

Defined in: [src/atom/types.ts:1419](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1419)

The app's state version at serve time — the anchor "what has moved since?" is asked from.

#### Inherited from

[`OfferRef`](/api/index/interfaces/OfferRef).[`stateVersion`](/api/index/interfaces/OfferRef#stateversion)

***

### structureVersion

> **structureVersion**: `number`

Defined in: [src/atom/types.ts:1421](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1421)

The served-surface version at serve time (mounts, frames, enablement flips).

#### Inherited from

[`OfferRef`](/api/index/interfaces/OfferRef).[`structureVersion`](/api/index/interfaces/OfferRef#structureversion)

***

### version

> **version**: `number`

Defined in: [src/atom/types.ts:1451](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1451)

The cursor version at first serve — what `keysChangedSince` is asked with
when a fire cites this offer. Older than a re-serve's cursor by design: no
state key can be committed without `stateVersion` moving, and a moved
`stateVersion` is a different offer, so the two windows name the same keys.
