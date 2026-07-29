---
title: LintOptions
---

# Interface: LintOptions

Defined in: [src/testing/model/lint.ts:65](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/model/lint.ts#L65)

## Properties

### externalKeys?

> `optional` **externalKeys?**: `string`[]

Defined in: [src/testing/model/lint.ts:78](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/model/lint.ts#L78)

Keys supplied from OUTSIDE the graph's own writes (a server push, a store
the app seeds, a parent app). Listed here they count as producible, so a
guard over them is not flagged as dangling.

***

### initialState?

> `optional` **initialState?**: `Record`\<`string`, `unknown`\> \| `string`[]

Defined in: [src/testing/model/lint.ts:72](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/model/lint.ts#L72)

The keys (or a sample object) the app guarantees before any action runs —
the initial projected state. Supplying it lets the linter PROMOTE
"gated on a key nothing produces" from a warning to an error: with the
initial world known, an unproducible key is provably dead.

***

### startPage?

> `optional` **startPage?**: `string`

Defined in: [src/testing/model/lint.ts:80](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/model/lint.ts#L80)

Which page the app starts on (default: the first declared page).
