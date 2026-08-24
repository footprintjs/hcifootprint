---
title: ActionSettleContract<Stages>
---

# Type Alias: ActionSettleContract\<Stages\>

> **ActionSettleContract**\<`Stages`\> = `ActionSettleFields`\<`Stages`\> & \{ `writes`: readonly `string`[]; \} \| \{ `reads`: readonly `string`[]; \} \| \{ `goTo`: `string`; \} \| \{ `verify`: [`VerifyContract`](/api/index/type-aliases/VerifyContract); \} \| \{ `observability`: [`Observability`](/api/index/type-aliases/Observability); \} \| \{ `progress`: [`ActionProgressDeclaration`](/api/index/interfaces/ActionProgressDeclaration)\<`Stages`\>; \}

Defined in: [src/action/types.ts:129](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L129)

Grouped effect, evidence, and progress declarations for one action.

## Type Parameters

### Stages

`Stages` *extends* readonly `string`[] = readonly `string`[]
