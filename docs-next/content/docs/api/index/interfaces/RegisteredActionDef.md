---
title: RegisteredActionDef
---

# Interface: RegisteredActionDef

Defined in: [src/traverse/nav-session.ts:70](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L70)

An action declared at mount time. `does` is a registration-site source-code literal — still authored.

## Extends

- [`ActionDef`](/api/index/interfaces/ActionDef)

## Extended by

- [`LiveAction`](/api/index/interfaces/LiveAction)

## Properties

### binding?

> `optional` **binding?**: [`Binding`](/api/index/type-aliases/Binding)

Defined in: [src/tree/types.ts:36](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L36)

How to reach it on screen (optional — L0b actuation; handlers don't need it).

#### Inherited from

[`ActionDef`](/api/index/interfaces/ActionDef).[`binding`](/api/index/interfaces/ActionDef#binding)

***

### confirm?

> `optional` **confirm?**: `boolean`

Defined in: [src/tree/types.ts:58](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L58)

Requires explicit confirmation (the high-effect gate).

#### Inherited from

[`ActionDef`](/api/index/interfaces/ActionDef).[`confirm`](/api/index/interfaces/ActionDef#confirm)

***

### does

> **does**: `string`

Defined in: [src/tree/types.ts:34](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L34)

AUTHORED intent, one string two readers (consumer label = agent tool description).

#### Inherited from

[`ActionDef`](/api/index/interfaces/ActionDef).[`does`](/api/index/interfaces/ActionDef#does)

***

### enabledWhen?

> `optional` **enabledWhen?**: [`WhereFilter`](/api/index/type-aliases/WhereFilter)\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/tree/types.ts:52](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L52)

Is this control currently CLICKABLE? Declarative disabledness — a different
question from `when`, which decides whether the control is here at all. A
failed `when` HIDES the action; a false `enabledWhen` SERVES it as a greyed
button (`enabled: false` on the edge) and refuses a fire as TOOL_DISABLED.

Declare it from the same expression that renders `<button disabled={…}>` and
an agent stops discovering the answer by clicking. Keys it cannot evaluate
never disable anything — the library does not guess a control greyed out.

NOT composed with ancestor `when`s: this is the control's own state, not
its position in the tree.

#### Inherited from

[`ActionDef`](/api/index/interfaces/ActionDef).[`enabledWhen`](/api/index/interfaces/ActionDef#enabledwhen)

***

### goTo?

> `optional` **goTo?**: `string`

Defined in: [src/tree/types.ts:56](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L56)

Page this action claims to navigate to (a top-level page id).

#### Inherited from

[`ActionDef`](/api/index/interfaces/ActionDef).[`goTo`](/api/index/interfaces/ActionDef#goto)

***

### handler?

> `optional` **handler?**: [`ActionHandler`](/api/index/type-aliases/ActionHandler)

Defined in: [src/traverse/nav-session.ts:71](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L71)

***

### input?

> `optional` **input?**: `unknown`

Defined in: [src/tree/types.ts:69](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L69)

Payload contract: Zod, JSON Schema, any `.safeParse`/`.parse` validator —
or the literal `'none'`, meaning "this control takes NO input". A caller
that sends one anyway is refused with the shape it sent, and a blank
payload is erased before it can reach the handler and override the app's
own defaults.

OMITTING `input` says something different: the library does not know the
shape, so it advertises nothing rather than inventing an empty contract.

#### Inherited from

[`ActionDef`](/api/index/interfaces/ActionDef).[`input`](/api/index/interfaces/ActionDef#input)

***

### role?

> `optional` **role?**: [`CanonicalRole`](/api/index/type-aliases/CanonicalRole)

Defined in: [src/tree/types.ts:78](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L78)

#### Inherited from

[`ActionDef`](/api/index/interfaces/ActionDef).[`role`](/api/index/interfaces/ActionDef#role)

***

### verify?

> `optional` **verify?**: [`VerifyContract`](/api/index/type-aliases/VerifyContract)

Defined in: [src/tree/types.ts:77](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L77)

The app's OWN check that firing this really did something — evaluated once,
at settlement, and the only thing that can turn a handler that merely RAN
into an honest refusal. Either a filter over projected state
(`{ 'wizard.recipe': { ne: '' } }`) or a synchronous predicate whose closure
may read whatever the app can see, the DOM included.

#### Inherited from

[`ActionDef`](/api/index/interfaces/ActionDef).[`verify`](/api/index/interfaces/ActionDef#verify)

***

### when?

> `optional` **when?**: [`WhereFilter`](/api/index/type-aliases/WhereFilter)\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/tree/types.ts:38](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L38)

Availability guard over projected state (AND-composed with every ancestor `when`).

#### Inherited from

[`ActionDef`](/api/index/interfaces/ActionDef).[`when`](/api/index/interfaces/ActionDef#when)

***

### writes?

> `optional` **writes?**: `string`[]

Defined in: [src/tree/types.ts:54](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L54)

State keys this action claims to change.

#### Inherited from

[`ActionDef`](/api/index/interfaces/ActionDef).[`writes`](/api/index/interfaces/ActionDef#writes)
