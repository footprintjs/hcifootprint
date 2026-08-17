---
title: LintOptions
---

# Interface: LintOptions

Defined in: [src/testing/model/lint.ts:67](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/model/lint.ts#L67)

## Properties

### externalKeys?

> `optional` **externalKeys?**: `string`[]

Defined in: [src/testing/model/lint.ts:80](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/model/lint.ts#L80)

Keys supplied from OUTSIDE the graph's own writes (a server push, a store
the app seeds, a parent app). Listed here they count as producible, so a
guard over them is not flagged as dangling.

***

### initialState?

> `optional` **initialState?**: `string`[] \| `Record`\<`string`, `unknown`\>

Defined in: [src/testing/model/lint.ts:74](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/model/lint.ts#L74)

The keys (or a sample object) the app guarantees before any action runs —
the initial projected state. Supplying it lets the linter PROMOTE
"gated on a key nothing produces" from a warning to an error: with the
initial world known, an unproducible key is provably dead.

***

### startPage?

> `optional` **startPage?**: `string`

Defined in: [src/testing/model/lint.ts:82](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/model/lint.ts#L82)

Which page the app starts on (default: the first declared page).
