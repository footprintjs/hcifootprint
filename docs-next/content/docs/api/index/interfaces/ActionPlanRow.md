---
title: ActionPlanRow
---

# Interface: ActionPlanRow

Defined in: [src/action/walk.ts:83](https://github.com/footprintjs/hcifootprint/blob/main/src/action/walk.ts#L83)

One step's fate. `ran` means a transition exists — read ITS statuses for
 how the invocation and effect went; the row does not repeat them.

## Properties

### definition

> `readonly` **definition**: [`ActionDefinitionRef`](/api/index/interfaces/ActionDefinitionRef)

Defined in: [src/action/walk.ts:85](https://github.com/footprintjs/hcifootprint/blob/main/src/action/walk.ts#L85)

***

### refusal?

> `readonly` `optional` **refusal?**: `string`

Defined in: [src/action/walk.ts:89](https://github.com/footprintjs/hcifootprint/blob/main/src/action/walk.ts#L89)

The teaching sentence, verbatim, when the step never became a transition.

***

### status

> `readonly` **status**: [`ActionPlanRowStatus`](/api/index/type-aliases/ActionPlanRowStatus)

Defined in: [src/action/walk.ts:86](https://github.com/footprintjs/hcifootprint/blob/main/src/action/walk.ts#L86)

***

### step

> `readonly` **step**: `number`

Defined in: [src/action/walk.ts:84](https://github.com/footprintjs/hcifootprint/blob/main/src/action/walk.ts#L84)

***

### transition?

> `readonly` `optional` **transition?**: [`ActionTransitionRef`](/api/index/interfaces/ActionTransitionRef)\<`string`\>

Defined in: [src/action/walk.ts:87](https://github.com/footprintjs/hcifootprint/blob/main/src/action/walk.ts#L87)
