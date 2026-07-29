---
title: SkillDef
---

# Interface: SkillDef

Defined in: [src/atom/types.ts:210](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L210)

## Extended by

- [`Skill`](/api/index/interfaces/Skill)

## Properties

### description

> **description**: `string`

Defined in: [src/atom/types.ts:212](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L212)

AUTHORED planner-facing text (same string class as affordance descriptions).

***

### precondition?

> `optional` **precondition?**: `WhereFilter`\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/atom/types.ts:215](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L215)

***

### steps

> **steps**: `string`[]

Defined in: [src/atom/types.ts:214](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L214)

Affordance ids, in canonical order. v0: linear; step-DAG is roadmap.
