---
title: LiveBindingPort
---

# Interface: LiveBindingPort

Defined in: [src/graph/sources/types.ts:115](https://github.com/footprintjs/hcifootprint/blob/main/src/graph/sources/types.ts#L115)

What a live source needs from a session — structural and type-only, so
fromLiveStore stays a zero-value-import leaf. InteractionSession satisfies
it as-is: the declare-then-bind wire (registerActions) plus the visibility
wire (show/setVisible) an app may drive after its own handler flips tabs.

## Methods

### registerActions()

> **registerActions**(`path`, `opts?`): [`ActionGroupHandle`](/api/index/interfaces/ActionGroupHandle)

Defined in: [src/graph/sources/types.ts:116](https://github.com/footprintjs/hcifootprint/blob/main/src/graph/sources/types.ts#L116)

#### Parameters

##### path

`string`

##### opts?

[`RegisterActionGroupOptions`](/api/index/interfaces/RegisterActionGroupOptions)

#### Returns

[`ActionGroupHandle`](/api/index/interfaces/ActionGroupHandle)

***

### reportGap()?

> `optional` **reportGap**(`opts`): `unknown`

Defined in: [src/graph/sources/types.ts:151](https://github.com/footprintjs/hcifootprint/blob/main/src/graph/sources/types.ts#L151)

File a row in the session's gap ledger — the AGENT-VISIBLE half of a dev
warning. A live source uses it for one thing: saying out loud that a read
failed and the bindings being served are from before the failure. A warning
alone reaches the developer's console and nothing else, so the surface
would still be served as current fact.

AGENT-VISIBLE is earned by the mark, not by the row: a read-failure report
passes [ReportGapOptions.actionsMayBeStale](/api/index/interfaces/ReportGapOptions#actionsmaybestale), which is what puts an
authored line in the facts block. Without it the row reaches the app's
triage ledger only.

Optional and severable, like the hook above; InteractionSession satisfies it
as-is. Not a general side channel — a source that files anything else is
writing into a ledger whose whole meaning is unmet demand.

#### Parameters

##### opts

[`ReportGapOptions`](/api/index/interfaces/ReportGapOptions)

#### Returns

`unknown`

***

### setVisible()

> **setVisible**(`path`, `visible`): `void`

Defined in: [src/graph/sources/types.ts:118](https://github.com/footprintjs/hcifootprint/blob/main/src/graph/sources/types.ts#L118)

#### Parameters

##### path

`string`

##### visible

`boolean`

#### Returns

`void`

***

### show()

> **show**(`path`): `void`

Defined in: [src/graph/sources/types.ts:117](https://github.com/footprintjs/hcifootprint/blob/main/src/graph/sources/types.ts#L117)

#### Parameters

##### path

`string`

#### Returns

`void`

***

### whenPageChanges()?

> `optional` **whenPageChanges**(`listener`): () => `void`

Defined in: [src/graph/sources/types.ts:134](https://github.com/footprintjs/hcifootprint/blob/main/src/graph/sources/types.ts#L134)

Run something each time the app REPORTS that it is on a different page —
the INVALIDATION half of the contract, and the half an app cannot supply.

Your store must emit whenever the action surface changes; NAVIGATION is
covered by this re-read, because a store whose actions are derived from the
router has no change of its own to announce when the page changes. It fires
on an observed page change (`sync()`), never on a navigation the app merely
CLAIMED — reading a store at that moment describes the page the app has not
left yet. A source that does not subscribe (or a port that does not offer
this) keeps exactly today's behaviour: store emissions and nothing else.

Optional and severable — a hand-rolled port without it degrades rather than
breaks. InteractionSession satisfies it as-is.

#### Parameters

##### listener

() => `void`

#### Returns

() => `void`
