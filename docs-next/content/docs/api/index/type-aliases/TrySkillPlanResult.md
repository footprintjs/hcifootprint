---
title: TrySkillPlanResult
---

# Type Alias: TrySkillPlanResult

> **TrySkillPlanResult** = \{ `ok`: `true`; `plan`: [`SkillPlan`](/api/index/interfaces/SkillPlan); \} \| \{ `known`: `string`[]; `ok`: `false`; `reason`: `"UNKNOWN_SKILL"`; \}

Defined in: [src/atom/types.ts:1078](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1078)

trySkillPlan()'s answer: the plan, or the unknown-id refusal as a VALUE.

Its failure arm is CommitSkillResult's UNKNOWN_SKILL arm, field for field —
same reason string, same `known` list. Two methods that answer the same
question ("is this a skill?") must not teach a caller two shapes for the
answer, or handling one of them is no preparation for the other.
