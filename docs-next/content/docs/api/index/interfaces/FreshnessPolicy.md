---
title: FreshnessPolicy
---

# Interface: FreshnessPolicy

Defined in: [src/atom/types.ts:409](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L409)

FOUR AXES, EACH ANSWERED SEPARATELY — declare it per action
(`ActionDef.freshness`) or once for the session
([SessionOptions.freshness](/api/index/interfaces/SessionOptions#freshness)); the action's own answer wins, axis by
axis, and an axis nobody answered is `'disclose'`.

Every axis compares the [OfferRecord](/api/index/interfaces/OfferRecord) a fire CITES against the session
right now. A fire that cites no offer cannot be compared to anything, which is
why an enforcing policy requires the citation (`OFFER_REQUIRED`) — see
[FireOptions.offerId](/api/index/interfaces/FireOptions#offerid).

```ts
'settle-claim': {
  does: 'Settle the claim',
  reads: ['claim.total'], writes: ['purse.left'],
  freshness: { readChanges: 'require-ack', writeChanges: 'refuse' },
}
```

KEY NAMES AND VERSIONS ONLY. No value is compared, held or served on this
path: the mechanism says a key moved, never that its value is now wrong. What
the movement MEANS stays on the app's side of the seam — which is why the
response is something an integrator declares rather than something the library
picks.

## Properties

### guardChanges?

> `optional` **guardChanges?**: [`FreshnessResponse`](/api/index/type-aliases/FreshnessResponse)

Defined in: [src/atom/types.ts:415](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L415)

A key this control's GUARD is judged on has been committed since the offer.
The guard still passes — a guard that stopped passing is `GUARD_FAILED`,
which fires first and is not this.

***

### positionChanges?

> `optional` **positionChanges?**: [`FreshnessResponse`](/api/index/type-aliases/FreshnessResponse)

Defined in: [src/atom/types.ts:425](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L425)

The cursor is on a different page than when the row was served, or the
served structure has changed under it (`structureVersion`). Both halves are
"the row you planned against is not the surface you are firing into".

***

### readChanges?

> `optional` **readChanges?**: [`FreshnessResponse`](/api/index/type-aliases/FreshnessResponse)

Defined in: [src/atom/types.ts:417](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L417)

A key the app declared this control's outcome READS has been committed since the offer.

***

### writeChanges?

> `optional` **writeChanges?**: [`FreshnessResponse`](/api/index/type-aliases/FreshnessResponse)

Defined in: [src/atom/types.ts:419](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L419)

A key the app declared this control WRITES has been committed since the offer.
