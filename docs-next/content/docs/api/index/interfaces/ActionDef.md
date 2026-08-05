---
title: ActionDef
---

# Interface: ActionDef

Defined in: [src/tree/types.ts:39](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L39)

An action on a node. Only `does` is required — details may materialize at mount.

## Extended by

- [`RegisteredActionDef`](/api/index/interfaces/RegisteredActionDef)

## Properties

### binding?

> `optional` **binding?**: [`Binding`](/api/index/type-aliases/Binding)

Defined in: [src/tree/types.ts:43](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L43)

How to reach it on screen (optional — L0b actuation; handlers don't need it).

***

### blockedBecause?

> `optional` **blockedBecause?**: [`BlockedBecause`](/api/index/interfaces/BlockedBecause) \| (() => [`BlockedBecause`](/api/index/interfaces/BlockedBecause) \| `undefined`)

Defined in: [src/tree/types.ts:93](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L93)

YOUR OWN REASON THIS CONTROL IS OFF, and who clears it — served only while
the control is off, and only ever as data.

`enabledWhen` proves a control is greyed and hands the reader the conjuncts
that failed; that is EVIDENCE, and it is derived. This is the other half:
the sentence your component already knows ("waiting for the upload to
finish") and the one fact no evidence carries — WHO can clear it. See
[BlockedBecause](/api/index/interfaces/BlockedBecause).

```ts
next: {
  does: 'Continue to review',
  blockedBecause: { says: 'Waiting for the receipt to finish uploading', clearedBy: 'app' },
}
```

The FUNCTION form is for a reason that changes while the page is open. It
is a READER, declared like `holds`: it runs at the moment a row is
assembled, never cached, and returning `undefined` says nothing at all.
Keep it a read — it runs on a hot path, and a reader that throws costs the
row its sentence and nothing else.

```ts
blockedBecause: () => (upload.pending
  ? { says: `Uploading ${upload.name}…`, clearedBy: 'app' }
  : undefined),
```

It never disables anything: declaring it on a control nothing has switched
off changes not one byte of what is served. Say WHY here; say WHETHER with
`enabledWhen`, `enabled:`, `setEnabled`, or a live store row.

***

### confirm?

> `optional` **confirm?**: `boolean`

Defined in: [src/tree/types.ts:113](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L113)

Requires explicit confirmation (the high-effect gate).

***

### does

> **does**: `string`

Defined in: [src/tree/types.ts:41](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L41)

AUTHORED intent, one string two readers (consumer label = agent tool description).

***

### enabledWhen?

> `optional` **enabledWhen?**: [`WhereFilter`](/api/index/type-aliases/WhereFilter)\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/tree/types.ts:59](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L59)

Is this control currently CLICKABLE? Declarative disabledness — a different
question from `when`, which decides whether the control is here at all. A
failed `when` HIDES the action; a false `enabledWhen` SERVES it as a greyed
button (`enabled: false` on the edge) and refuses a fire as TOOL_DISABLED.

Declare it from the same expression that renders `<button disabled={…}>` and
an agent stops discovering the answer by clicking. Keys it cannot evaluate
never disable anything — the library does not guess a control greyed out.

NOT composed with ancestor `when`s: this is the control's own state, not
its position in the tree.

***

### goTo?

> `optional` **goTo?**: `string`

Defined in: [src/tree/types.ts:111](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L111)

Page this action claims to navigate to (a top-level page id).

***

### humanDecides?

> `optional` **humanDecides?**: [`HumanDecides`](/api/index/interfaces/HumanDecides)

Defined in: [src/tree/types.ts:157](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L157)

THIS CHOICE IS THE PERSON'S TO MAKE — not a gate on the agent acting, but a
statement that the decision itself belongs to a human.

`confirm` asks whether the agent may ACT after a human's yes. This says the
agent's correct move is to PRESENT options and stop: the human answers
through this control in the app, and the flow moves because the world moved.

```ts
'choose-shipping-speed': {
  does: 'Choose a shipping speed',
  writes: ['checkout.shipping'],
  humanDecides: {
    about: 'which shipping speed',
    doneWhen: { 'checkout.shipping': { ne: '' } },
  },
}
```

It is a fact about the CONTROL, declared once and inherited by every journey
that names it — a per-journey split would let two lists disagree about one
control's owner. It is DISCLOSURE: nothing is refused, and no refusal word
exists for it. See [HumanDecides](/api/index/interfaces/HumanDecides).

***

### input?

> `optional` **input?**: `unknown`

Defined in: [src/tree/types.ts:124](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L124)

Payload contract: Zod, JSON Schema, any `.safeParse`/`.parse` validator —
or the literal `'none'`, meaning "this control takes NO input". A caller
that sends one anyway is refused with the shape it sent, and a blank
payload is erased before it can reach the handler and override the app's
own defaults.

OMITTING `input` says something different: the library does not know the
shape, so it advertises nothing rather than inventing an empty contract.

***

### reads?

> `optional` **reads?**: `string`[]

Defined in: [src/tree/types.ts:109](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L109)

State keys this action's OUTCOME DEPENDS ON — the read side of `writes`,
and the one an app is asked for so a reader can be told that something it
depends on moved.

```ts
settle: { does: 'Settle the claim', writes: ['purse.left'], reads: ['claim.total'] },
```

Not `when`: that decides whether the control is HERE. This says what the
outcome is computed FROM. Declared, never inferred — see [Effect.reads](/api/index/interfaces/Effect#reads)
for the law and for what the serving layer does with it.

***

### role?

> `optional` **role?**: [`CanonicalRole`](/api/index/type-aliases/CanonicalRole)

Defined in: [src/tree/types.ts:158](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L158)

***

### verify?

> `optional` **verify?**: [`VerifyContract`](/api/index/type-aliases/VerifyContract)

Defined in: [src/tree/types.ts:132](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L132)

The app's OWN check that firing this really did something — evaluated once,
at settlement, and the only thing that can turn a handler that merely RAN
into an honest refusal. Either a filter over projected state
(`{ 'wizard.recipe': { ne: '' } }`) or a synchronous predicate whose closure
may read whatever the app can see, the DOM included.

***

### when?

> `optional` **when?**: [`WhereFilter`](/api/index/type-aliases/WhereFilter)\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/tree/types.ts:45](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L45)

Availability guard over projected state (AND-composed with every ancestor `when`).

***

### writes?

> `optional` **writes?**: `string`[]

Defined in: [src/tree/types.ts:95](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L95)

State keys this action claims to change.
