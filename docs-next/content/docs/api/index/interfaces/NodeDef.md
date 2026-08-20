---
title: NodeDef
---

# Interface: NodeDef

Defined in: [src/tree/types.ts:254](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L254)

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

## Extended by

- [`ModalDef`](/api/index/interfaces/ModalDef)
- [`PageNodeDef`](/api/index/interfaces/PageNodeDef)

## Properties

### actions?

> `optional` **actions?**: `Record`\<`string`, [`ActionDef`](/api/index/interfaces/ActionDef)\>

Defined in: [src/tree/types.ts:301](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L301)

The controls on this node.

***

### areas?

> `optional` **areas?**: `Record`\<`string`, `NodeDef`\>

Defined in: [src/tree/types.ts:265](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L265)

Sibling regions that coexist — a sidebar and a detail pane are both here.

Declaring a container without ever observing it gives you mount-tracking
but not position — see the deepest-node rule on [NodeDef](/api/index/interfaces/NodeDef).

***

### does?

> `optional` **does?**: `string`

Defined in: [src/tree/types.ts:256](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L256)

Optional authored description of the container itself.

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

***

### modals?

> `optional` **modals?**: `Record`\<`string`, [`ModalDef`](/api/index/interfaces/ModalDef)\>

Defined in: [src/tree/types.ts:290](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L290)

Overlays. A shown blocking modal masks sibling actions (`blocks: false`
opts a popover out), and a modal is NEVER assumed active: closed until
registered or shown.

Declaring a container without ever observing it gives you mount-tracking
but not position — see the deepest-node rule on [NodeDef](/api/index/interfaces/NodeDef). For a
modal the order matters: `show()` opens it, and an `observeFocus()` naming
a modal nobody opened resolves to the page, because a closed modal cannot
hold anyone.

***

### repeats?

> `optional` **repeats?**: `boolean`

Defined in: [src/tree/types.ts:292](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L292)

Template container: instances carry runtime keys (order cards, product tiles).

***

### tabs?

> `optional` **tabs?**: `Record`\<`string`, `NodeDef`\>

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

***

### when?

> `optional` **when?**: [`WhereFilter`](/api/index/type-aliases/WhereFilter)\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/tree/types.ts:258](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L258)

Container guard: every descendant action's guard is AND-narrowed by this.
