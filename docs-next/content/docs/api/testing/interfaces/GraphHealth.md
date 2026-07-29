---
title: GraphHealth
---

# Interface: GraphHealth

Defined in: [src/testing/model/check.ts:35](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/model/check.ts#L35)

## Properties

### byType

> **byType**: `Record`\<[`DriftType`](/api/testing/type-aliases/DriftType), [`LintFinding`](/api/testing/interfaces/LintFinding)[]\>

Defined in: [src/testing/model/check.ts:43](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/model/check.ts#L43)

Findings grouped by drift type — control (buttons/inputs), page, flow, note.

***

### errors

> **errors**: `number`

Defined in: [src/testing/model/check.ts:38](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/model/check.ts#L38)

***

### findings

> **findings**: [`LintFinding`](/api/testing/interfaces/LintFinding)[]

Defined in: [src/testing/model/check.ts:41](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/model/check.ts#L41)

The full lint output (errors, warnings, and advisory notes).

***

### ok

> **ok**: `boolean`

Defined in: [src/testing/model/check.ts:37](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/model/check.ts#L37)

True when there are no error-severity findings — the release-readiness signal.

***

### skills

> **skills**: [`SkillHealth`](/api/testing/interfaces/SkillHealth)[]

Defined in: [src/testing/model/check.ts:45](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/model/check.ts#L45)

Per-skill feasibility rollup.

***

### summary

> **summary**: `string`

Defined in: [src/testing/model/check.ts:49](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/model/check.ts#L49)

A ready-to-print, plain-language report. Empty-ish (a ✓ line) when healthy.

***

### unreachablePages

> **unreachablePages**: `string`[]

Defined in: [src/testing/model/check.ts:47](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/model/check.ts#L47)

Pages nothing can navigate to.

***

### warnings

> **warnings**: `number`

Defined in: [src/testing/model/check.ts:39](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/model/check.ts#L39)
