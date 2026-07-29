---
title: SkillDef
---

# Interface: SkillDef

Defined in: [src/atom/types.ts:161](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L161)

## Extended by

- [`Skill`](/api/index/interfaces/Skill)

## Properties

### description

> **description**: `string`

Defined in: [src/atom/types.ts:163](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L163)

AUTHORED planner-facing text (same string class as affordance descriptions).

***

### precondition?

> `optional` **precondition?**: `WhereFilter`\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/atom/types.ts:166](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L166)

***

### steps

> **steps**: `string`[]

Defined in: [src/atom/types.ts:165](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L165)

Affordance ids, in canonical order. v0: linear; step-DAG is roadmap.
