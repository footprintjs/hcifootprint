---
title: RoutedPages
---

# Type Alias: RoutedPages

> **RoutedPages** = `Record`\<`string`, \{ `route?`: `string`; \}\>

Defined in: [src/graph/route-match.ts:39](https://github.com/footprintjs/hcifootprint/blob/main/src/graph/route-match.ts#L39)

The least this needs from a page: the route it declared. `SkillGraphSpec['pages']`
satisfies it structurally, and so does a hand-built map — reading the whole
compiled Page would force a caller to build one just to ask a question about
strings.
