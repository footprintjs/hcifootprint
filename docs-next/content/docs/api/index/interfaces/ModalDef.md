---
title: ModalDef
---

# Interface: ModalDef

Defined in: [src/tree/types.ts:304](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L304)

A container node: areas coexist (AND), tabs exclude (at most one shown),
modals overlay.

THE DEEPEST-NODE RULE, said once here and repeated on each bucket below:
**Sync pages; observe the deeper place. `sync()` moves the walker and decides
what is served; `observeFocus()` says which tab or area the reader is in.
Declare containers, and report the deepest one on screen.** Declaring a
container without ever observing it gives you mount-tracking but not
position: the containers are real nodes, and `session.observeFocus('page.tab')`
is what puts the reader inside one. `sync()` cannot — actions are served from
the PAGE, so a cursor on a tab would be served nothing.

## Extends

- [`NodeDef`](/api/index/interfaces/NodeDef)

## Properties

### actions?

> `optional` **actions?**: `Record`\<`string`, [`ActionDef`](/api/index/interfaces/ActionDef)\>

Defined in: [src/tree/types.ts:301](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L301)

The controls on this node.

#### Inherited from

[`NodeDef`](/api/index/interfaces/NodeDef).[`actions`](/api/index/interfaces/NodeDef#actions)

***

### areas?

> `optional` **areas?**: `Record`\<`string`, [`NodeDef`](/api/index/interfaces/NodeDef)\>

Defined in: [src/tree/types.ts:265](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L265)

Sibling regions that coexist — a sidebar and a detail pane are both here.

Declaring a container without ever observing it gives you mount-tracking
but not position — see the deepest-node rule on [NodeDef](/api/index/interfaces/NodeDef).

#### Inherited from

[`NodeDef`](/api/index/interfaces/NodeDef).[`areas`](/api/index/interfaces/NodeDef#areas)

***

### blocks?

> `optional` **blocks?**: `boolean`

Defined in: [src/tree/types.ts:306](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L306)

Default true: a shown modal masks actions outside it. `false` = popover (coexists).

***

### does?

> `optional` **does?**: `string`

Defined in: [src/tree/types.ts:256](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L256)

Optional authored description of the container itself.

#### Inherited from

[`NodeDef`](/api/index/interfaces/NodeDef).[`does`](/api/index/interfaces/NodeDef#does)

***

### instances?

> `optional` **instances?**: (`state`) => `string`[]

Defined in: [src/tree/types.ts:299](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L299)

L2 existence source for a repeats container: the COMPLETE instance set,
from projected state (order #57 exists while scrolled out of view).
Without it, served instance lists fall back to the mounted window —
honestly marked enumeration:'mounted-window'.

#### Parameters

##### state

`Record`\<`string`, `unknown`\>

#### Returns

`string`[]

#### Inherited from

[`NodeDef`](/api/index/interfaces/NodeDef).[`instances`](/api/index/interfaces/NodeDef#instances)

***

### modals?

> `optional` **modals?**: `Record`\<`string`, `ModalDef`\>

Defined in: [src/tree/types.ts:290](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L290)

Overlays. A shown blocking modal masks sibling actions (`blocks: false`
opts a popover out), and a modal is NEVER assumed active: closed until
registered or shown.

Declaring a container without ever observing it gives you mount-tracking
but not position — see the deepest-node rule on [NodeDef](/api/index/interfaces/NodeDef). For a
modal the order matters: `show()` opens it, and an `observeFocus()` naming
a modal nobody opened resolves to the page, because a closed modal cannot
hold anyone.

#### Inherited from

[`NodeDef`](/api/index/interfaces/NodeDef).[`modals`](/api/index/interfaces/NodeDef#modals)

***

### repeats?

> `optional` **repeats?**: `boolean`

Defined in: [src/tree/types.ts:292](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L292)

Template container: instances carry runtime keys (order cards, product tiles).

#### Inherited from

[`NodeDef`](/api/index/interfaces/NodeDef).[`repeats`](/api/index/interfaces/NodeDef#repeats)

***

### tabs?

> `optional` **tabs?**: `Record`\<`string`, [`NodeDef`](/api/index/interfaces/NodeDef)\>

Defined in: [src/tree/types.ts:278](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L278)

An exclusivity PRIOR: at most one of these is shown. Not a statechart — no
transitions, no initial, no history.

Declaring a container without ever observing it gives you mount-tracking
but not position — see the deepest-node rule on [NodeDef](/api/index/interfaces/NodeDef). Tabs are
where that bites hardest: the whole point of the bucket is that ONE of them
is where the reader is, and nothing but evidence can say which — and a
person clicking a tab fires nothing, so only an observation can carry it.
`session.show('page.tab')` says which tab is VISIBLE;
`session.observeFocus('page.tab')` says the reader is IN it.

#### Inherited from

[`NodeDef`](/api/index/interfaces/NodeDef).[`tabs`](/api/index/interfaces/NodeDef#tabs)

***

### when?

> `optional` **when?**: [`WhereFilter`](/api/index/type-aliases/WhereFilter)\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/tree/types.ts:258](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L258)

Container guard: every descendant action's guard is AND-narrowed by this.

#### Inherited from

[`NodeDef`](/api/index/interfaces/NodeDef).[`when`](/api/index/interfaces/NodeDef#when)
