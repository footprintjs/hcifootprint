---
title: lintGraph
---

# Function: lintGraph()

> **lintGraph**(`graph`, `opts?`): [`LintFinding`](/api/testing/interfaces/LintFinding)[]

Defined in: [src/testing/model/lint.ts:107](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/model/lint.ts#L107)

Report every stale-logic drift provable from the graph alone. Returns an
empty array for a clean graph. Advisory by default; pass initialState +
externalKeys to promote provably-dead findings to errors.

## Parameters

### graph

[`NavigationGraph`](/api/index/interfaces/NavigationGraph)

### opts?

[`LintOptions`](/api/testing/interfaces/LintOptions)

## Returns

[`LintFinding`](/api/testing/interfaces/LintFinding)[]
