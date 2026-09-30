---
title: DeclaredContextSkip
---

# Interface: DeclaredContextSkip

Defined in: [src/action/declared-context.ts:79](https://github.com/footprintjs/hcifootprint/blob/main/src/action/declared-context.ts#L79)

A verified transition the fold could not read — counted, never dropped
 silently (the `channelGaps()` law). The settlement itself is untouched.

## Properties

### reader

> `readonly` **reader**: `"identity"` \| `"key"` \| `"releasedBy.identity"`

Defined in: [src/action/declared-context.ts:81](https://github.com/footprintjs/hcifootprint/blob/main/src/action/declared-context.ts#L81)

***

### reason

> `readonly` **reason**: `string`

Defined in: [src/action/declared-context.ts:82](https://github.com/footprintjs/hcifootprint/blob/main/src/action/declared-context.ts#L82)

***

### transition

> `readonly` **transition**: [`ActionTransitionRef`](/api/index/interfaces/ActionTransitionRef)

Defined in: [src/action/declared-context.ts:80](https://github.com/footprintjs/hcifootprint/blob/main/src/action/declared-context.ts#L80)
