---
title: Skill
---

# Interface: Skill

Defined in: [src/atom/types.ts:279](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L279)

## Extends

- [`SkillDef`](/api/index/interfaces/SkillDef)

## Properties

### description

> **description**: `string`

Defined in: [src/atom/types.ts:212](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L212)

AUTHORED planner-facing text (same string class as affordance descriptions).

#### Inherited from

[`SkillDef`](/api/index/interfaces/SkillDef).[`description`](/api/index/interfaces/SkillDef#description)

***

### id

> **id**: `string`

Defined in: [src/atom/types.ts:280](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L280)

***

### precondition?

> `optional` **precondition?**: `WhereFilter`\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/atom/types.ts:215](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L215)

#### Inherited from

[`SkillDef`](/api/index/interfaces/SkillDef).[`precondition`](/api/index/interfaces/SkillDef#precondition)

***

### steps

> **steps**: `string`[]

Defined in: [src/atom/types.ts:214](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L214)

Affordance ids, in canonical order. v0: linear; step-DAG is roadmap.

#### Inherited from

[`SkillDef`](/api/index/interfaces/SkillDef).[`steps`](/api/index/interfaces/SkillDef#steps)
