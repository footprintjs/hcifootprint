---
title: DeclaredContextEntry
---

# Interface: DeclaredContextEntry

Defined in: [src/action/declared-context.ts:60](https://github.com/footprintjs/hcifootprint/blob/main/src/action/declared-context.ts#L60)

One standing entry — data, frozen, structured-clone-safe, shaped to go
 straight into the next turn. The library never writes the prose.

## Properties

### attribution

> `readonly` **attribution**: [`Attribution`](/api/index/interfaces/Attribution)

Defined in: [src/action/declared-context.ts:74](https://github.com/footprintjs/hcifootprint/blob/main/src/action/declared-context.ts#L74)

Who set it — the transition's attribution.

***

### binding

> `readonly` **binding**: [`ActionBindingRef`](/api/index/interfaces/ActionBindingRef)

Defined in: [src/action/declared-context.ts:72](https://github.com/footprintjs/hcifootprint/blob/main/src/action/declared-context.ts#L72)

The control that set it.

***

### context

> `readonly` **context**: `string`

Defined in: [src/action/declared-context.ts:61](https://github.com/footprintjs/hcifootprint/blob/main/src/action/declared-context.ts#L61)

***

### identity

> `readonly` **identity**: `string`

Defined in: [src/action/declared-context.ts:65](https://github.com/footprintjs/hcifootprint/blob/main/src/action/declared-context.ts#L65)

***

### key

> `readonly` **key**: `string`

Defined in: [src/action/declared-context.ts:64](https://github.com/footprintjs/hcifootprint/blob/main/src/action/declared-context.ts#L64)

***

### kind

> `readonly` **kind**: `string`

Defined in: [src/action/declared-context.ts:63](https://github.com/footprintjs/hcifootprint/blob/main/src/action/declared-context.ts#L63)

The governed kind every value of this context is.

***

### transition

> `readonly` **transition**: [`ActionTransitionRef`](/api/index/interfaces/ActionTransitionRef)

Defined in: [src/action/declared-context.ts:70](https://github.com/footprintjs/hcifootprint/blob/main/src/action/declared-context.ts#L70)

Identity, not a promise of retention: `transitionFor` may later answer
 undefined once history releases the row.

***

### value

> `readonly` **value**: `unknown`

Defined in: [src/action/declared-context.ts:67](https://github.com/footprintjs/hcifootprint/blob/main/src/action/declared-context.ts#L67)

The verified evidence, exactly as recorded.
