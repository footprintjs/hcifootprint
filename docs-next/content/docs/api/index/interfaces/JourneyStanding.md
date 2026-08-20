---
title: JourneyStanding
---

# Interface: JourneyStanding

Defined in: [src/atom/types.ts:3179](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3179)

WHERE ONE JOURNEY STANDS — [Session.journeyStanding](/api/index/classes/Session#journeystanding)'s answer, folded
fresh from the plan, the ask book, the decisions book, retained settlements
and frame history every time you ask.

A NEW PUBLISHED TYPE, and its `standing` strings are data on THIS type alone:
no existing union grows for it. `EffectStatus`, `Settlement`, `StepStatus`,
`FrameStatus`, `FireResult['reason']`, `GapRecord['rejectionReason']`,
`GapReason` and the [Binding](/api/index/type-aliases/Binding) kinds are byte-identical to what they were.

## Properties

### evidence

> **evidence**: `object`

Defined in: [src/atom/types.ts:3206](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3206)

Why that word, in facts — POINTERS and structural evidence, never a receipts pack.

#### about?

> `optional` **about?**: `string`

`'with-the-human'` — the app's own words for what is being decided (DATA).

#### askId?

> `optional` **askId?**: `string`

`'awaiting-human'` / `'declined'` — the card. A POINTER, never the receipts.

#### blockedOn?

> `optional` **blockedOn?**: `FilterCondition`[]

`'blocked'` — the conditions that did not hold.

#### guardUnevaluated?

> `optional` **guardUnevaluated?**: `string`[]

Guard keys taken on faith — carried, never resolved. Taken-on-faith is not blocked.

#### made?

> `optional` **made?**: `boolean` \| `"unknown"`

`'with-the-human'` — whether the app's own `doneWhen` holds (see [DecisionStatus.made](/api/index/interfaces/DecisionStatus#made)).

#### madeBy?

> `optional` **madeBy?**: [`Principal`](/api/index/type-aliases/Principal)

`'with-the-human'` — who made it, from the decisions book. Absent unless identity carried it.

#### step?

> `optional` **step?**: `string`

The governing step (the first not-done step in chain order), where one exists.

#### stepsDone

> **stepsDone**: `number`

#### stepsTotal

> **stepsTotal**: `number`

#### transitionId?

> `optional` **transitionId?**: `string`

`'failed'` — a POINTER to the settled fire. The receipt itself is `did_it_work`'s to serve.

***

### journeyId

> **journeyId**: `string`

Defined in: [src/atom/types.ts:3180](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3180)

***

### standing

> **standing**: `"declined"` \| `"done"` \| `"blocked"` \| `"in-progress"` \| `"awaiting-human"` \| `"with-the-human"` \| `"failed"`

Defined in: [src/atom/types.ts:3197](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3197)

- `'done'` — every step is done, or a completed frame closed it.
- `'in-progress'` — open, and nothing is holding it (including a journey
  nobody has started: `stepsDone: 0` says plainly that nothing has fired).
- `'awaiting-human'` — the governing step's card is open. The referent is a
  CARD, and `evidence.askId` names it.
- `'with-the-human'` — the governing step's decision belongs to a person and
  nothing was fired. There is no card and no id: the human answers through
  the app's own control.
- `'blocked'` — the governing step's guard was evaluated and failed.
- `'failed'` — the governing step's LAST attempt came to rest badly. NEVER
  minted from any pause: a refusal is not an execution, so nothing ran and
  nothing failed.
- `'declined'` — the human answered no to the governing step's latest card,
  through their own door.
