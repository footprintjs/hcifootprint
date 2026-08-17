---
title: expectNoStaleLogic
---

# Function: expectNoStaleLogic()

> **expectNoStaleLogic**(`graph`, `opts?`): `void`

Defined in: [src/testing/model/lint.ts:344](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/model/lint.ts#L344)

Throw if the graph has stale-logic findings at or above `failOn` (default
'error'). The opt-in CI gate: `expectNoStaleLogic(graph, { initialState })`
fails a commit that drifts the graph. Report-by-default stays the norm —
call lintGraph directly to inspect without failing.

## Parameters

### graph

[`NavigationGraph`](/api/index/interfaces/NavigationGraph)

### opts?

[`LintOptions`](/api/testing/interfaces/LintOptions) & `object`

## Returns

`void`
