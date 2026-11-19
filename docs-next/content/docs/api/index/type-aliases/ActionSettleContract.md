---
title: ActionSettleContract<Stages, Output>
---

# Type Alias: ActionSettleContract\<Stages, Output\>

> **ActionSettleContract**\<`Stages`, `Output`\> = `ActionSettleFields`\<`Stages`, `Output`\> & \{ `writes`: readonly `string`[]; \} \| \{ `reads`: readonly `string`[]; \} \| \{ `goTo`: `string`; \} \| \{ `verify`: [`VerifyContract`](/api/index/type-aliases/VerifyContract); \} \| \{ `observability`: [`Observability`](/api/index/type-aliases/Observability); \} \| \{ `progress`: [`ActionProgressDeclaration`](/api/index/interfaces/ActionProgressDeclaration)\<`Stages`\>; \} \| \{ `evidence`: [`ActionEvidenceDeclaration`](/api/index/interfaces/ActionEvidenceDeclaration); \} \| \{ `onReturn`: [`ActionEffectSettlementInput`](/api/index/type-aliases/ActionEffectSettlementInput) \| `undefined`; \}

Defined in: [src/action/types.ts:169](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L169)

Grouped effect, evidence, and progress declarations for one action.

## Type Parameters

### Stages

`Stages` *extends* readonly `string`[] = readonly `string`[]

### Output

`Output` = `any`
