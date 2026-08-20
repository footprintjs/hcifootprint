---
title: OfferRef
---

# Interface: OfferRef

Defined in: [src/atom/types.ts:1411](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1411)

THE NAME OF ONE SERVED ROW — stamped on every edge `available()` hands over,
so a fire can say which row it was planned against.

A CITATION, NOT A SECRET AND NOT A CAPABILITY. `offerId` is a session-local
counter (`'offer#7'`), it is handed to the model on the row it names, and
holding one authorizes nothing: every gate this library has — guard, payload,
disabled, materialisation, human approval — runs exactly as it did whether a
fire cites an offer or not. What the citation buys is a JOIN: the library can
compare what was true when the row was served against what is true now, which
is a comparison nobody could make while `expectedVersion` was a number the
caller typed in by hand. Treat it the way [FireOptions.askId](/api/index/interfaces/FireOptions#askid) is treated
— a pointer to a row this session wrote, worthless to guess.

The four version fields are the anchor that comparison is made from, and they
are what makes two rows the same offer or different ones.

## Extended by

- [`OfferRecord`](/api/index/interfaces/OfferRecord)

## Properties

### actionId

> **actionId**: `string`

Defined in: [src/atom/types.ts:1415](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1415)

The action this row was for.

***

### node

> **node**: `string`

Defined in: [src/atom/types.ts:1417](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1417)

The page the cursor was on when it was served.

***

### offerId

> **offerId**: `string`

Defined in: [src/atom/types.ts:1413](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1413)

This offer's id, unique within the session. Cite it as [FireOptions.offerId](/api/index/interfaces/FireOptions#offerid).

***

### stateVersion

> **stateVersion**: `number`

Defined in: [src/atom/types.ts:1419](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1419)

The app's state version at serve time — the anchor "what has moved since?" is asked from.

***

### structureVersion

> **structureVersion**: `number`

Defined in: [src/atom/types.ts:1421](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1421)

The served-surface version at serve time (mounts, frames, enablement flips).
