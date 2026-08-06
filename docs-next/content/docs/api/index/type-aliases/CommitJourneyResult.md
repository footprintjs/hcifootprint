---
title: CommitJourneyResult
---

# Type Alias: CommitJourneyResult

> **CommitJourneyResult** = \{ `frame`: [`JourneyFrame`](/api/index/interfaces/JourneyFrame); `ok`: `true`; `plan`: [`JourneyPlan`](/api/index/interfaces/JourneyPlan); `version`: `number`; \} \| \{ `known`: `string`[]; `ok`: `false`; `reason`: `"UNKNOWN_JOURNEY"`; \} \| \{ `ok`: `false`; `reason`: `"STALE_CURSOR"`; `version`: `number`; \} \| \{ `evidence`: `FilterCondition`[]; `ok`: `false`; `reason`: `"PRECONDITION_FAILED"`; \} \| \{ `journeyId`: `string`; `ok`: `false`; `reason`: `"FRAME_ALREADY_OPEN"`; \} \| \{ `affordanceId`: `string`; `gesture?`: [`Binding`](/api/index/type-aliases/Binding); `ok`: `false`; `reason`: `"ENTRY_NOT_MATERIALIZED"`; \}

Defined in: [src/atom/types.ts:2218](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2218)

## Union Members

### Type Literal

\{ `frame`: [`JourneyFrame`](/api/index/interfaces/JourneyFrame); `ok`: `true`; `plan`: [`JourneyPlan`](/api/index/interfaces/JourneyPlan); `version`: `number`; \}

***

### Type Literal

\{ `known`: `string`[]; `ok`: `false`; `reason`: `"UNKNOWN_JOURNEY"`; \}

***

### Type Literal

\{ `ok`: `false`; `reason`: `"STALE_CURSOR"`; `version`: `number`; \}

***

### Type Literal

\{ `evidence`: `FilterCondition`[]; `ok`: `false`; `reason`: `"PRECONDITION_FAILED"`; \}

***

### Type Literal

\{ `journeyId`: `string`; `ok`: `false`; `reason`: `"FRAME_ALREADY_OPEN"`; \}

***

### Type Literal

\{ `affordanceId`: `string`; `gesture?`: [`Binding`](/api/index/type-aliases/Binding); `ok`: `false`; `reason`: `"ENTRY_NOT_MATERIALIZED"`; \}

The never-trap commit gate: the journey's ENTRY step would answer an agent
fire NOT_MATERIALIZED right now, so the frame that could never act is
never opened (an agent standing in a room where nothing it was promised
works is a planning trap, even with the leave-journey escape). Fires only
for agent commits outside a tour (allowUnmaterializedFires). `gesture`
carries the entry step's declared binding, when it has one — the refusal
names the wiring that is missing.
