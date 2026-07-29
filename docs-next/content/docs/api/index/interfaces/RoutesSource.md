---
title: RoutesSource<PageIds>
---

# Interface: RoutesSource\<PageIds\>

Defined in: [src/graph/sources/types.ts:31](https://github.com/footprintjs/hcifootprint/blob/main/src/graph/sources/types.ts#L31)

A route table read as pages — the spine. `PageIds` carries the page names
through `const` inference so a source-contributed page is a REAL typed node
path on the compiled graph (registerToolGroup/show/setVisible accept it;
a typo stays a compile error).

## Type Parameters

### PageIds

`PageIds` *extends* `string` = `string`

## Properties

### kind

> `readonly` **kind**: `"routes"`

Defined in: [src/graph/sources/types.ts:32](https://github.com/footprintjs/hcifootprint/blob/main/src/graph/sources/types.ts#L32)

***

### pages

> `readonly` **pages**: `Record`\<`PageIds`, [`PageNodeDef`](/api/index/interfaces/PageNodeDef)\>

Defined in: [src/graph/sources/types.ts:33](https://github.com/footprintjs/hcifootprint/blob/main/src/graph/sources/types.ts#L33)
