---
title: ActionEffectSettlement<Id>
---

# Type Alias: ActionEffectSettlement\<Id\>

> **ActionEffectSettlement**\<`Id`\> = \{ `evidence`: `unknown`; `status`: `"verified"`; `transition`: [`ActionTransitionRef`](/api/index/interfaces/ActionTransitionRef)\<`Id`\>; \} \| \{ `reason`: `unknown`; `status`: `"refused"`; `transition`: [`ActionTransitionRef`](/api/index/interfaces/ActionTransitionRef)\<`Id`\>; \} \| \{ `authority`: [`ActionAbandonmentAuthority`](/api/index/type-aliases/ActionAbandonmentAuthority); `status`: `"abandoned"`; `transition`: [`ActionTransitionRef`](/api/index/interfaces/ActionTransitionRef)\<`Id`\>; \}

Defined in: [src/action/types.ts:352](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L352)

## Type Parameters

### Id

`Id` *extends* `string` = `string`

## Union Members

### Type Literal

\{ `evidence`: `unknown`; `status`: `"verified"`; `transition`: [`ActionTransitionRef`](/api/index/interfaces/ActionTransitionRef)\<`Id`\>; \}

***

### Type Literal

\{ `reason`: `unknown`; `status`: `"refused"`; `transition`: [`ActionTransitionRef`](/api/index/interfaces/ActionTransitionRef)\<`Id`\>; \}

***

### Type Literal

\{ `authority`: [`ActionAbandonmentAuthority`](/api/index/type-aliases/ActionAbandonmentAuthority); `status`: `"abandoned"`; `transition`: [`ActionTransitionRef`](/api/index/interfaces/ActionTransitionRef)\<`Id`\>; \}

#### authority

> `readonly` **authority**: [`ActionAbandonmentAuthority`](/api/index/type-aliases/ActionAbandonmentAuthority)

#### status

> `readonly` **status**: `"abandoned"`

Authoritative evidence can no longer arrive for this transition.

#### transition

> `readonly` **transition**: [`ActionTransitionRef`](/api/index/interfaces/ActionTransitionRef)\<`Id`\>
