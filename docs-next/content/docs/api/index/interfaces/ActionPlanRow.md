---
title: ActionPlanRow
---

# Interface: ActionPlanRow

Defined in: src/action/walk.ts:74

One step's fate. `ran` means a transition exists — read ITS statuses for
 how the invocation and effect went; the row does not repeat them.

## Properties

### definition

> `readonly` **definition**: [`ActionDefinitionRef`](/api/index/interfaces/ActionDefinitionRef)

Defined in: src/action/walk.ts:76

***

### refusal?

> `readonly` `optional` **refusal?**: `string`

Defined in: src/action/walk.ts:80

The teaching sentence, verbatim, when the step never became a transition.

***

### status

> `readonly` **status**: [`ActionPlanRowStatus`](/api/index/type-aliases/ActionPlanRowStatus)

Defined in: src/action/walk.ts:77

***

### step

> `readonly` **step**: `number`

Defined in: src/action/walk.ts:75

***

### transition?

> `readonly` `optional` **transition?**: [`ActionTransitionRef`](/api/index/interfaces/ActionTransitionRef)\<`string`\>

Defined in: src/action/walk.ts:78
