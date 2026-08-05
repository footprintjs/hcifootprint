---
title: ActionExpectation
---

# Interface: ActionExpectation

Defined in: [src/contextful/types.ts:65](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/types.ts#L65)

What the app declares it EXPECTS to see happen at the anchor — the only way
`effect: 'observed'` can ever be written (law 4).

Mechanism and meaning, split at the seam this library always splits them at:
the LIBRARY observes that the anchor's subtree changed and hands over the
name-class of that change; the APP says whether that change is the effect it
declared. The library never guesses which mutation counts, and the predicate
never sees a value — so an expectation cannot become a value-capture door.

## Properties

### matches

> **matches**: (`change`) => `boolean`

Defined in: [src/contextful/types.ts:69](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/types.ts#L69)

True when this observed change IS the effect you declared.

#### Parameters

##### change

[`SensedChange`](/api/index/interfaces/SensedChange)

#### Returns

`boolean`

***

### name

> **name**: `string`

Defined in: [src/contextful/types.ts:67](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/types.ts#L67)

Your own name for this expectation. Data channel: it rides the record, never prose.
