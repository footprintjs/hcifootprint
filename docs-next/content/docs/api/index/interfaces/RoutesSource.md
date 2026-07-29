---
title: RoutesSource<PageIds>
---

# Interface: RoutesSource\<PageIds\>

Defined in: [src/graph/sources/types.ts:32](https://github.com/footprintjs/hcifootprint/blob/main/src/graph/sources/types.ts#L32)

A route table read as pages — the spine. `PageIds` carries the page names
through `const` inference so a source-contributed page is a REAL typed node
path on the compiled graph (registerToolGroup/show/setVisible accept it;
a typo stays a compile error).

## Type Parameters

### PageIds

`PageIds` *extends* `string` = `string`

## Properties

### crossLinks?

> `readonly` `optional` **crossLinks?**: `true` \| readonly `PageIds`[]

Defined in: [src/graph/sources/types.ts:42](https://github.com/footprintjs/hcifootprint/blob/main/src/graph/sources/types.ts#L42)

The crossLinks REQUEST this table was read with — `true` (every page whose
route is fully literal) or the named subset. Snapshot DATA, not tools: the
factory sees one route table, while the link's `on` list is "every page in
the effective graph except the target". Only mergeSources knows that set,
so it is the one place the request materialises.

***

### kind

> `readonly` **kind**: `"routes"`

Defined in: [src/graph/sources/types.ts:33](https://github.com/footprintjs/hcifootprint/blob/main/src/graph/sources/types.ts#L33)

***

### pages

> `readonly` **pages**: `Record`\<`PageIds`, [`PageNodeDef`](/api/index/interfaces/PageNodeDef)\>

Defined in: [src/graph/sources/types.ts:34](https://github.com/footprintjs/hcifootprint/blob/main/src/graph/sources/types.ts#L34)
