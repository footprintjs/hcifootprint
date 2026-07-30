---
title: Skill
---

# Interface: Skill

Defined in: [src/atom/types.ts:286](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L286)

## Extends

- [`SkillDef`](/api/index/interfaces/SkillDef)

## Properties

### description

> **description**: `string`

Defined in: [src/atom/types.ts:219](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L219)

AUTHORED planner-facing text (same string class as affordance descriptions).

#### Inherited from

[`SkillDef`](/api/index/interfaces/SkillDef).[`description`](/api/index/interfaces/SkillDef#description)

***

### id

> **id**: `string`

Defined in: [src/atom/types.ts:287](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L287)

***

### precondition?

> `optional` **precondition?**: `WhereFilter`\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/atom/types.ts:222](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L222)

#### Inherited from

[`SkillDef`](/api/index/interfaces/SkillDef).[`precondition`](/api/index/interfaces/SkillDef#precondition)

***

### steps

> **steps**: `string`[]

Defined in: [src/atom/types.ts:221](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L221)

Affordance ids, in canonical order. v0: linear; step-DAG is roadmap.

#### Inherited from

[`SkillDef`](/api/index/interfaces/SkillDef).[`steps`](/api/index/interfaces/SkillDef#steps)
