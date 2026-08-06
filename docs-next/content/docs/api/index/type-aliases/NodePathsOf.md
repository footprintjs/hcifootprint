---
title: NodePathsOf<Def>
---

# Type Alias: NodePathsOf\<Def\>

> **NodePathsOf**\<`Def`\> = `Def` *extends* `object` ? `P` *extends* `Record`\<`string`, `unknown`\> ? \{ \[K in keyof P & string\]: K \| ChildPaths\<K, P\[K\]\> \}\[keyof `P` & `string`\] : `string` : `Def` *extends* `object` ? `never` : `string` \| `Def` *extends* `object` ? `SourcePagePaths`\<`S`\> : `never`

Defined in: [src/tree/types.ts:368](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L368)

The union of every declared node path in a NavigationGraphDef literal — hand-authored pages and their children, plus routes-source pages.

## Type Parameters

### Def

`Def`
