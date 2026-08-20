---
title: TryJourneyPlanResult
---

# Type Alias: TryJourneyPlanResult

> **TryJourneyPlanResult** = \{ `ok`: `true`; `plan`: [`JourneyPlan`](/api/index/interfaces/JourneyPlan); \} \| \{ `known`: `string`[]; `ok`: `false`; `reason`: `"UNKNOWN_JOURNEY"`; \}

Defined in: [src/atom/types.ts:3348](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3348)

tryJourneyPlan()'s answer: the plan, or the unknown-id refusal as a VALUE.

Its failure arm is CommitJourneyResult's UNKNOWN_JOURNEY arm, field for field
— same reason string, same `known` list. Two methods that answer the same
question ("is this a journey?") must not teach a caller two shapes for the
answer, or handling one of them is no preparation for the other.
