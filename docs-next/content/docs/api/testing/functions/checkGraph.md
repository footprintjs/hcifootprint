---
title: checkGraph
---

# Function: checkGraph()

> **checkGraph**(`graph`, `opts?`): [`GraphHealth`](/api/testing/interfaces/GraphHealth)

Defined in: [src/testing/model/check.ts:77](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/model/check.ts#L77)

One-call health check: lint + group by drift type + per-journey rollup + a printable summary.

## Parameters

### graph

[`NavigationGraph`](/api/index/interfaces/NavigationGraph)

### opts?

[`LintOptions`](/api/testing/interfaces/LintOptions)

## Returns

[`GraphHealth`](/api/testing/interfaces/GraphHealth)
