---
title: CommitSkillResult
---

# Type Alias: CommitSkillResult

> **CommitSkillResult** = \{ `frame`: [`SkillFrame`](/api/index/interfaces/SkillFrame); `ok`: `true`; `plan`: [`SkillPlan`](/api/index/interfaces/SkillPlan); `version`: `number`; \} \| \{ `known`: `string`[]; `ok`: `false`; `reason`: `"UNKNOWN_SKILL"`; \} \| \{ `ok`: `false`; `reason`: `"STALE_CURSOR"`; `version`: `number`; \} \| \{ `evidence`: `FilterCondition`[]; `ok`: `false`; `reason`: `"PRECONDITION_FAILED"`; \} \| \{ `ok`: `false`; `reason`: `"FRAME_ALREADY_OPEN"`; `skillId`: `string`; \} \| \{ `affordanceId`: `string`; `gesture?`: [`Binding`](/api/index/type-aliases/Binding); `ok`: `false`; `reason`: `"ENTRY_NOT_MATERIALIZED"`; \}

Defined in: [src/atom/types.ts:1339](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1339)

## Union Members

### Type Literal

\{ `frame`: [`SkillFrame`](/api/index/interfaces/SkillFrame); `ok`: `true`; `plan`: [`SkillPlan`](/api/index/interfaces/SkillPlan); `version`: `number`; \}

***

### Type Literal

\{ `known`: `string`[]; `ok`: `false`; `reason`: `"UNKNOWN_SKILL"`; \}

***

### Type Literal

\{ `ok`: `false`; `reason`: `"STALE_CURSOR"`; `version`: `number`; \}

***

### Type Literal

\{ `evidence`: `FilterCondition`[]; `ok`: `false`; `reason`: `"PRECONDITION_FAILED"`; \}

***

### Type Literal

\{ `ok`: `false`; `reason`: `"FRAME_ALREADY_OPEN"`; `skillId`: `string`; \}

***

### Type Literal

\{ `affordanceId`: `string`; `gesture?`: [`Binding`](/api/index/type-aliases/Binding); `ok`: `false`; `reason`: `"ENTRY_NOT_MATERIALIZED"`; \}

The never-trap commit gate: the skill's ENTRY step would answer an agent
fire NOT_MATERIALIZED right now, so the frame that could never act is
never opened (an agent standing in a room where nothing it was promised
works is a planning trap, even with the leave-skill escape). Fires only
for agent commits outside a tour (allowUnmaterializedFires). `gesture`
carries the entry step's declared binding, when it has one — the refusal
names the wiring that is missing.
