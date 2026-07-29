---
title: buildNavigationGraph
---

# Function: buildNavigationGraph()

> **buildNavigationGraph**\<`Def`\>(`id`, `rawDef`): [`NavigationGraph`](/api/index/interfaces/NavigationGraph)\<[`NodePathsOf`](/api/index/type-aliases/NodePathsOf)\<`Def`\>\>

Defined in: [src/tree/appmap.ts:38](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/appmap.ts#L38)

Compile a navigation graph. The `const` type parameter preserves the literal
node names, so the returned graph's session methods (registerToolGroup,
setVisible, show) accept ONLY real node paths — a typo is a compile error.

## Type Parameters

### Def

`Def` *extends* [`NavigationGraphDef`](/api/index/interfaces/NavigationGraphDef)

## Parameters

### id

`string`

### rawDef

`Def`

## Returns

[`NavigationGraph`](/api/index/interfaces/NavigationGraph)\<[`NodePathsOf`](/api/index/type-aliases/NodePathsOf)\<`Def`\>\>
