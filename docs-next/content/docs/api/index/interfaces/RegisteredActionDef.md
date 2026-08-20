---
title: RegisteredActionDef
---

# Interface: RegisteredActionDef

Defined in: [src/traverse/nav-session.ts:93](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L93)

An action declared at mount time. `does` is a registration-site source-code literal — still authored.

## Extends

- [`ActionDef`](/api/index/interfaces/ActionDef)

## Extended by

- [`LiveAction`](/api/index/interfaces/LiveAction)

## Properties

### binding?

> `optional` **binding?**: [`Binding`](/api/index/type-aliases/Binding)

Defined in: [src/tree/types.ts:47](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L47)

How to reach it on screen (optional — L0b actuation; handlers don't need it).

#### Inherited from

[`ActionDef`](/api/index/interfaces/ActionDef).[`binding`](/api/index/interfaces/ActionDef#binding)

***

### blockedBecause?

> `optional` **blockedBecause?**: [`BlockedBecause`](/api/index/interfaces/BlockedBecause) \| (() => [`BlockedBecause`](/api/index/interfaces/BlockedBecause) \| `undefined`)

Defined in: [src/tree/types.ts:97](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L97)

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

#### Inherited from

[`ActionDef`](/api/index/interfaces/ActionDef).[`blockedBecause`](/api/index/interfaces/ActionDef#blockedbecause)

***

### concurrency?

> `optional` **concurrency?**: [`ConcurrencyPolicy`](/api/index/interfaces/ConcurrencyPolicy)

Defined in: [src/tree/types.ts:237](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L237)

MAY A SECOND FIRE OVERLAP AN UNRESOLVED FIRST? Default `'parallel'` — what
every release before this one did.

```ts
'pay-invoice': {
  does: 'Pay the invoice', confirm: true, writes: ['invoice.paid'],
  concurrency: { mode: 'single-flight', scope: 'payload' },
}
```

Under `'single-flight'` a fire made while a prior occurrence is still
unresolved is refused `PRIOR_FIRE_PENDING`, carrying that fire's id and the
doors that can settle it. It clears on settlement and on nothing else — no
timeout, no second look, and not the caller reporting it done. See
[ConcurrencyPolicy](/api/index/interfaces/ConcurrencyPolicy).

#### Inherited from

[`ActionDef`](/api/index/interfaces/ActionDef).[`concurrency`](/api/index/interfaces/ActionDef#concurrency)

***

### confirm?

> `optional` **confirm?**: `boolean`

Defined in: [src/tree/types.ts:117](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L117)

Requires explicit confirmation (the high-effect gate).

#### Inherited from

[`ActionDef`](/api/index/interfaces/ActionDef).[`confirm`](/api/index/interfaces/ActionDef#confirm)

***

### does

> **does**: `string`

Defined in: [src/tree/types.ts:45](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L45)

AUTHORED intent, one string two readers (consumer label = agent tool description).

#### Inherited from

[`ActionDef`](/api/index/interfaces/ActionDef).[`does`](/api/index/interfaces/ActionDef#does)

***

### enabledWhen?

> `optional` **enabledWhen?**: [`WhereFilter`](/api/index/type-aliases/WhereFilter)\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/tree/types.ts:63](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L63)

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

### freshness?

> `optional` **freshness?**: [`FreshnessPolicy`](/api/index/interfaces/FreshnessPolicy)

Defined in: [src/tree/types.ts:219](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L219)

WHAT THIS CONTROL DOES WHEN SOMETHING IT WAS OFFERED UNDER HAS SINCE MOVED
— declared per axis, and `'disclose'` (today's behaviour) wherever you say
nothing.

```ts
'settle-claim': {
  does: 'Settle the claim',
  reads: ['claim.total'], writes: ['purse.left'],
  freshness: { readChanges: 'require-ack', writeChanges: 'refuse' },
}
```

It is the enforceable sibling of the `staleReads` / `staleWrites` stamps,
which say the same thing and refuse nothing. Declaring it overrides the
session default AXIS BY AXIS, and an enforcing axis makes one new demand of
the caller: cite the offer you planned against
([FireOptions.offerId](/api/index/interfaces/FireOptions#offerid)). See [FreshnessPolicy](/api/index/interfaces/FreshnessPolicy).

#### Inherited from

[`ActionDef`](/api/index/interfaces/ActionDef).[`freshness`](/api/index/interfaces/ActionDef#freshness)

***

### goTo?

> `optional` **goTo?**: `string`

Defined in: [src/tree/types.ts:115](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L115)

Page this action claims to navigate to (a top-level page id).

#### Inherited from

[`ActionDef`](/api/index/interfaces/ActionDef).[`goTo`](/api/index/interfaces/ActionDef#goto)

***

### handler?

> `optional` **handler?**: [`ActionHandler`](/api/index/type-aliases/ActionHandler)

Defined in: [src/traverse/nav-session.ts:94](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L94)

***

### humanDecides?

> `optional` **humanDecides?**: [`HumanDecides`](/api/index/interfaces/HumanDecides)

Defined in: [src/tree/types.ts:161](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L161)

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

#### Inherited from

[`ActionDef`](/api/index/interfaces/ActionDef).[`humanDecides`](/api/index/interfaces/ActionDef#humandecides)

***

### input?

> `optional` **input?**: `unknown`

Defined in: [src/tree/types.ts:128](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L128)

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

### observability?

> `optional` **observability?**: [`Observability`](/api/index/type-aliases/Observability)

Defined in: [src/tree/types.ts:199](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L199)

HOW WOULD ANYONE SEE THAT THIS HAPPENED — `'state-delta'`,
`'postcondition'`, `'navigation'`, `'external'` or `'unobservable'`.

Declared, never inferred, and it refuses nothing on its own. A session
created with `effectPolicy: { highEffectRequiresVerify: true }` reads it and
refuses a high-effect action whose effect nobody could check — where
`'state-delta'` deliberately does NOT count, because key presence is not
value correctness. See [Observability](/api/index/type-aliases/Observability).

Two coherence rules are refused HERE, at authoring, whether or not any
session enforces anything: `'postcondition'` needs a `verify`, and
`'navigation'` needs a `goTo`.

#### Inherited from

[`ActionDef`](/api/index/interfaces/ActionDef).[`observability`](/api/index/interfaces/ActionDef#observability)

***

### principalPolicy?

> `optional` **principalPolicy?**: [`PrincipalPolicy`](/api/index/interfaces/PrincipalPolicy)

Defined in: [src/tree/types.ts:184](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L184)

WHO MAY PERFORM THIS, WHOSE CHOICE IT IS, AND WHETHER A RECORDED YES IS
NEEDED — three separate facts, three fields, never one word.

`humanDecides` above is disclosure and stays disclosure. This is its
enforceable neighbour, and it enforces NOTHING until the session is created
with `enforcePrincipalPolicy: true` — declaring it changes not one byte
otherwise.

```ts
'transfer-funds': {
  does: 'Transfer the balance',
  confirm: true,
  principalPolicy: { mayInvoke: ['human'], requiresHumanApproval: true },
}
```

Note the vocabulary: a policy names an ACTOR (`'human'`), while a record
files an act under a principal (`'user'`). Writing `mayInvoke: ['user']` is
refused at this door with the correction, rather than silently locking a
person out of their own control. See [PrincipalPolicy](/api/index/interfaces/PrincipalPolicy).

#### Inherited from

[`ActionDef`](/api/index/interfaces/ActionDef).[`principalPolicy`](/api/index/interfaces/ActionDef#principalpolicy)

***

### reads?

> `optional` **reads?**: `string`[]

Defined in: [src/tree/types.ts:113](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L113)

State keys this action's OUTCOME DEPENDS ON — the read side of `writes`,
and the one an app is asked for so a reader can be told that something it
depends on moved.

```ts
settle: { does: 'Settle the claim', writes: ['purse.left'], reads: ['claim.total'] },
```

Not `when`: that decides whether the control is HERE. This says what the
outcome is computed FROM. Declared, never inferred — see [Effect.reads](/api/index/interfaces/Effect#reads)
for the law and for what the serving layer does with it.

#### Inherited from

[`ActionDef`](/api/index/interfaces/ActionDef).[`reads`](/api/index/interfaces/ActionDef#reads)

***

### role?

> `optional` **role?**: [`CanonicalRole`](/api/index/type-aliases/CanonicalRole)

Defined in: [src/tree/types.ts:238](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L238)

#### Inherited from

[`ActionDef`](/api/index/interfaces/ActionDef).[`role`](/api/index/interfaces/ActionDef#role)

***

### verify?

> `optional` **verify?**: [`VerifyContract`](/api/index/type-aliases/VerifyContract)

Defined in: [src/tree/types.ts:136](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L136)

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

Defined in: [src/tree/types.ts:49](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L49)

Availability guard over projected state (AND-composed with every ancestor `when`).

#### Inherited from

[`ActionDef`](/api/index/interfaces/ActionDef).[`when`](/api/index/interfaces/ActionDef#when)

***

### writes?

> `optional` **writes?**: `string`[]

Defined in: [src/tree/types.ts:99](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L99)

State keys this action claims to change.

#### Inherited from

[`ActionDef`](/api/index/interfaces/ActionDef).[`writes`](/api/index/interfaces/ActionDef#writes)
