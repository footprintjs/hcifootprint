---
title: ActionDefinitionRecord<Id, Mode>
---

# Interface: ActionDefinitionRecord\<Id, Mode\>

Defined in: [src/action/types.ts:130](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L130)

The immutable metadata carried under the callable definition's Symbol.for brand.

## Type Parameters

### Id

`Id` *extends* `string` = `string`

### Mode

`Mode` *extends* [`ActionInvocationMode`](/api/index/type-aliases/ActionInvocationMode) = [`ActionInvocationMode`](/api/index/type-aliases/ActionInvocationMode)

## Properties

### contract

> `readonly` **contract**: `object` & `object`

Defined in: [src/action/types.ts:135](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L135)

#### Type Declaration

##### blockedBecause?

> `readonly` `optional` **blockedBecause?**: (() => [`BlockedBecause`](/api/index/interfaces/BlockedBecause) \| `undefined`) \| \{ `clearedBy`: `"app"` \| `"user"` \| `"invalid"`; `says`: `string`; \}

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

###### Union Members

###### Function

() => [`BlockedBecause`](/api/index/interfaces/BlockedBecause) \| `undefined`

***

###### Type Literal

\{ `clearedBy`: `"app"` \| `"user"` \| `"invalid"`; `says`: `string`; \}

###### clearedBy

> `readonly` **clearedBy**: `"app"` \| `"user"` \| `"invalid"`

Who clears it: 'app' → the agent waits; 'user' → interrupt the person; 'invalid' → report a validation problem.

###### says

> `readonly` **says**: `string`

Registration-site app text — the same string class, and the same trust tier, as `does`.

##### concurrency?

> `readonly` `optional` **concurrency?**: `object`

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

###### concurrency.mode

> `readonly` **mode**: `"parallel"` \| `"single-flight"` \| `"once"`

`'once'` extends `'single-flight'` past settlement: one EXECUTED occurrence
per scope for the life of the session, reopened only by a person acting on
the screen (a user-attributed transition after the occurrence's receipt) —
and the reopened repeat FIRES, carrying `FireResult.repeated`, rather than
being refused. While the first occurrence is still unresolved, `'once'`
refuses exactly as `'single-flight'` does (`PRIOR_FIRE_PENDING`); once it
settles, the repeat is refused `DUPLICATE_EXECUTION` with the receipt in
hand. A REFUSED occurrence never counts — it provably did not execute.
See `traverse/once.ts` for the whole of the law.

###### concurrency.scope?

> `readonly` `optional` **scope?**: `"instance"` \| `"action"` \| `"payload"`

WHAT COUNTS AS "THE SAME FIRE AGAIN". Default `'action'`.

- `'action'` — one occurrence of this control at a time, whatever it carries.
- `'instance'` — one per repeats-container card (`FireOptions.instance`), so
  cancelling order #57 does not block cancelling #58.
- `'payload'` — one per identical input, compared over the same canonical
  rendering the approval gate uses. A payload this library cannot render
  faithfully (a Map, a Date, a cycle, anything past the caps) is treated as
  THE SAME as the pending one and refused: on a repeat-suppression boundary
  an unprovable difference is not a difference — the same stance
  `traverse/same-input.ts` takes, for the same reason.

##### confirm?

> `readonly` `optional` **confirm?**: `boolean`

Requires explicit confirmation (the high-effect gate).

##### does

> `readonly` **does**: `string`

AUTHORED intent, one string two readers (consumer label = agent tool description).

##### enabledWhen?

> `readonly` `optional` **enabledWhen?**: `object`

Is this control currently CLICKABLE? Declarative disabledness — a different
question from `when`, which decides whether the control is here at all. A
failed `when` HIDES the action; a false `enabledWhen` SERVES it as a greyed
button (`enabled: false` on the edge) and refuses a fire as TOOL_DISABLED.

Declare it from the same expression that renders `<button disabled={…}>` and
an agent stops discovering the answer by clicking. Keys it cannot evaluate
never disable anything — the library does not guess a control greyed out.

NOT composed with ancestor `when`s: this is the control's own state, not
its position in the tree.

###### Index Signature

\[`key`: `string`\]: \{ `eq?`: `unknown`; `gt?`: `unknown`; `gte?`: `unknown`; `in?`: readonly `unknown`[]; `lt?`: `unknown`; `lte?`: `unknown`; `ne?`: `unknown`; `notIn?`: readonly `unknown`[]; \} \| `undefined`

##### freshness?

> `readonly` `optional` **freshness?**: `object`

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

###### freshness.guardChanges?

> `readonly` `optional` **guardChanges?**: [`FreshnessResponse`](/api/index/type-aliases/FreshnessResponse)

A key this control's GUARD is judged on has been committed since the offer.
The guard still passes — a guard that stopped passing is `GUARD_FAILED`,
which fires first and is not this.

###### freshness.positionChanges?

> `readonly` `optional` **positionChanges?**: [`FreshnessResponse`](/api/index/type-aliases/FreshnessResponse)

The cursor is on a different page than when the row was served, or the
served structure has changed under it (`structureVersion`). Both halves are
"the row you planned against is not the surface you are firing into".

###### freshness.readChanges?

> `readonly` `optional` **readChanges?**: [`FreshnessResponse`](/api/index/type-aliases/FreshnessResponse)

A key the app declared this control's outcome READS has been committed since the offer.

###### freshness.writeChanges?

> `readonly` `optional` **writeChanges?**: [`FreshnessResponse`](/api/index/type-aliases/FreshnessResponse)

A key the app declared this control WRITES has been committed since the offer.

##### goTo?

> `readonly` `optional` **goTo?**: `string`

Page this action claims to navigate to (a top-level page id).

##### humanDecides?

> `readonly` `optional` **humanDecides?**: `object`

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

###### humanDecides.about?

> `readonly` `optional` **about?**: `string`

The app's own words for WHAT is being decided ('which shipping speed').

DATA, AND ONLY DATA. It rides structured fields — [DecisionStatus](/api/index/interfaces/DecisionStatus)
rows, the `withTheHuman` list in a frame result — and never enters an
authored sentence, `groundTruth()`, or the facts block, exactly as a `busy`
label and a [WorkRow.label](/api/index/interfaces/WorkRow#label) do not. The authored `does` already names
the control in the planner-facing string class; this exists for the app's
own domain phrasing.

Capped at 200 characters and refused LOUDLY at build when over — the same
cap every app string that crosses under, and a build-time refusal is kinder
than silent truncation for a string the author can fix once.

###### humanDecides.doneWhen?

> `readonly` `optional` **doneWhen?**: `object`

The app's own "it has been decided", as a plain serializable `WhereFilter`
over projected state — evaluated by the same evaluator, and under the same
honesty split, as every guard.

DELIBERATELY NOT A PREDICATE: a condition can prove a state, and only the
app's own filter grammar keeps the declaration exportable, explainable and
composable.

OMITTING IT IS LEGAL and says something exact — ownership is declared while
the app gave the library no way to know when the decision lands, so
[DecisionStatus.made](/api/index/interfaces/DecisionStatus#made) is `'unknown'` forever. Absence of a condition
is absence of knowledge, never a verdict. `doneWhen: {}` is a different
thing and is refused at build: footprint's evaluator never matches an empty
filter, so it could never hold.

Its keys join `NavigationGraph.requiredStateKeys()` — a projector that never
seeds them leaves `made` at `'unknown'` forever, which is honest and
degraded.

###### Index Signature

\[`key`: `string`\]: \{ `eq?`: `unknown`; `gt?`: `unknown`; `gte?`: `unknown`; `in?`: readonly `unknown`[]; `lt?`: `unknown`; `lte?`: `unknown`; `ne?`: `unknown`; `notIn?`: readonly `unknown`[]; \} \| `undefined`

##### inputSchema?

> `readonly` `optional` **inputSchema?**: `unknown`

Definition-side payload contract: Zod, JSON Schema, a `.safeParse`/`.parse`
validator, or `'none'`. Omission means the shape is not declared. The
Action Binding runtime enforces parseable schemas before the handler
runs. Other formats need `inputSchemaAdapter` or explicit disclosure mode.
Bound values are checked while minting an offer and caller values are
checked by `runtime.invoke()`. Live binding values use `input` readers.

##### invocation

> `readonly` **invocation**: [`ActionInvocationMode`](/api/index/type-aliases/ActionInvocationMode)

Explicit runtime call shape. `inputless` and `scalar` may be invoked
directly and brokered; `host` is recordable only through the exact host
continuation, preserving receivers and multi-argument listener calls.

##### needs?

> `readonly` `optional` **needs?**: `object`

Inert, named inputs reserved for a future channel broker. Layer 1 stores
these declarations but never matches a surface, collects a value, or
changes action availability from them.

###### Index Signature

\[`key`: `string`\]: `object`

##### observability?

> `readonly` `optional` **observability?**: [`Observability`](/api/index/type-aliases/Observability)

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

##### principalPolicy?

> `readonly` `optional` **principalPolicy?**: `object`

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

###### principalPolicy.decisionOwner?

> `readonly` `optional` **decisionOwner?**: `"human"` \| `"agent"` \| `"either"`

DECISION OWNERSHIP — whose call the choice is. DISCLOSURE, and enforcement
never reads it: an owner is not a permission, and making "this is the
customer's choice" silently mean "the agent is forbidden" would be a refusal
nobody wrote. An app that wants ownership enforced says `mayInvoke: ['human']`
and means it.

`'either'` is a real answer, not a shrug: the app looked and says both may.

###### principalPolicy.mayInvoke?

> `readonly` `optional` **mayInvoke?**: readonly [`ActorKind`](/api/index/type-aliases/ActorKind)[]

ACTOR IDENTITY — the kinds that may invoke this action. The ONE half
enforcement gates: a fire from any other principal is refused
`PRINCIPAL_NOT_ALLOWED`, naming the kinds required.

Omitted means the app said nothing, never "everyone" as a decision — the
refusal only exists where a list does. `[]` is refused at authoring: an
action nobody may ever perform is an action not to declare.

###### principalPolicy.requiresHumanApproval?

> `readonly` `optional` **requiresHumanApproval?**: `boolean`

CONSENT STATUS — this action needs a recorded human approval, whether or not
it is marked `confirm`. Under enforcement it is held to the SAME gate
[SessionOptions.requireHumanApproval](/api/index/interfaces/SessionOptions#requirehumanapproval) applies to high-effect actions,
and it mints NO new refusal word: the `APPROVAL_*` set is unchanged.

##### produces?

> `readonly` `optional` **produces?**: `object`

Inert output declaration reserved for a future channel broker. Layer 1
records it without routing or rendering it.

###### produces.kind

> `readonly` **kind**: `string`

###### produces.schema?

> `readonly` `optional` **schema?**: `unknown`

##### reads?

> `readonly` `optional` **reads?**: readonly `string`[]

State keys this action's OUTCOME DEPENDS ON — the read side of `writes`,
and the one an app is asked for so a reader can be told that something it
depends on moved.

```ts
settle: { does: 'Settle the claim', writes: ['purse.left'], reads: ['claim.total'] },
```

Not `when`: that decides whether the control is HERE. This says what the
outcome is computed FROM. Declared, never inferred — see [Effect.reads](/api/index/interfaces/Effect#reads)
for the law and for what the serving layer does with it.

##### role?

> `readonly` `optional` **role?**: [`CanonicalRole`](/api/index/type-aliases/CanonicalRole)

##### verify?

> `readonly` `optional` **verify?**: \{\[`key`: `string`\]: \{ `eq?`: `unknown`; `gt?`: `unknown`; `gte?`: `unknown`; `in?`: readonly `unknown`[]; `lt?`: `unknown`; `lte?`: `unknown`; `ne?`: `unknown`; `notIn?`: readonly `unknown`[]; \} \| `undefined`; \} \| ((`state`) => `boolean`)

The app's OWN check that firing this really did something — evaluated once,
at settlement, and the only thing that can turn a handler that merely RAN
into an honest refusal. Either a filter over projected state
(`{ 'wizard.recipe': { ne: '' } }`) or a synchronous predicate whose closure
may read whatever the app can see, the DOM included.

##### when?

> `readonly` `optional` **when?**: `object`

Availability guard over projected state (AND-composed with every ancestor `when`).

###### Index Signature

\[`key`: `string`\]: \{ `eq?`: `unknown`; `gt?`: `unknown`; `gte?`: `unknown`; `in?`: readonly `unknown`[]; `lt?`: `unknown`; `lte?`: `unknown`; `ne?`: `unknown`; `notIn?`: readonly `unknown`[]; \} \| `undefined`

##### writes?

> `readonly` `optional` **writes?**: readonly `string`[]

State keys this action claims to change.

#### Type Declaration

##### invocation

> `readonly` **invocation**: `Mode`

***

### ref

> `readonly` **ref**: [`ActionDefinitionRef`](/api/index/interfaces/ActionDefinitionRef)\<`Id`\>

Defined in: [src/action/types.ts:134](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L134)
