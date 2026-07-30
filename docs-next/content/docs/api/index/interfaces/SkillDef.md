---
title: SkillDef
---

# Interface: SkillDef

Defined in: [src/atom/types.ts:217](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L217)

## Extended by

- [`Skill`](/api/index/interfaces/Skill)

## Properties

### description

> **description**: `string`

Defined in: [src/atom/types.ts:219](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L219)

AUTHORED planner-facing text (same string class as affordance descriptions).

***

### precondition?

> `optional` **precondition?**: `WhereFilter`\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/atom/types.ts:222](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L222)

***

### steps

> **steps**: `string`[]

Defined in: [src/atom/types.ts:221](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L221)

Affordance ids, in canonical order. v0: linear; step-DAG is roadmap.
