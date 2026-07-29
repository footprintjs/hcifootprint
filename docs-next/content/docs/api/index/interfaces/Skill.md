---
title: Skill
---

# Interface: Skill

Defined in: [src/atom/types.ts:210](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L210)

## Extends

- [`SkillDef`](/api/index/interfaces/SkillDef)

## Properties

### description

> **description**: `string`

Defined in: [src/atom/types.ts:163](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L163)

AUTHORED planner-facing text (same string class as affordance descriptions).

#### Inherited from

[`SkillDef`](/api/index/interfaces/SkillDef).[`description`](/api/index/interfaces/SkillDef#description)

***

### id

> **id**: `string`

Defined in: [src/atom/types.ts:211](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L211)

***

### precondition?

> `optional` **precondition?**: `WhereFilter`\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/atom/types.ts:166](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L166)

#### Inherited from

[`SkillDef`](/api/index/interfaces/SkillDef).[`precondition`](/api/index/interfaces/SkillDef#precondition)

***

### steps

> **steps**: `string`[]

Defined in: [src/atom/types.ts:165](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L165)

Affordance ids, in canonical order. v0: linear; step-DAG is roadmap.

#### Inherited from

[`SkillDef`](/api/index/interfaces/SkillDef).[`steps`](/api/index/interfaces/SkillDef#steps)
