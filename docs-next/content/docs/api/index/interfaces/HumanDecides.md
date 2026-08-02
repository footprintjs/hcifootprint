---
title: HumanDecides
---

# Interface: HumanDecides

Defined in: [src/atom/types.ts:313](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L313)

A DECISION THAT BELONGS TO A PERSON — declared once, on the control they
answer through.

[SessionOptions.requireHumanApproval](/api/index/interfaces/SessionOptions#requirehumanapproval) answers one question: may the
agent ACT — a human's recorded yes unlocks one fire. This answers a different
one. Some choices are the person's to MAKE: which plan, which shipping speed,
whether to sell at all. The agent's correct move there is to present options
and stop; the human answers through the app's OWN control, and the flow moves
because the world moved.

The library had no word for that, so a model met a choice control like any
other and fired it — or, told not to in prose, invented its own vocabulary for
the pause. Every near word this library already had describes something the
SYSTEM holds: a card, a gate, a greyed button. Here the system holds nothing.
There is no card, no `askId`, no refusal; the flow is simply in a person's
hands, and the standing word for that is `'with-the-human'`.

```ts
'choose-shipping-speed': {
  does: 'Choose a shipping speed',
  writes: ['checkout.shipping'],
  humanDecides: {
    about: 'which shipping speed',                 // app data — rides data fields only
    doneWhen: { 'checkout.shipping': { ne: '' } }, // the app's own "it has been decided"
  },
}
```

DISCLOSURE, NOT ENFORCEMENT. Declaring it refuses nothing: an agent fire of
such a control still succeeds, records principal `'agent'`, and the decisions
book then says `madeBy: 'agent'` — the app and the person can SEE that the
agent made a decision it was told to leave alone. No refusal word is minted
for it, here or anywhere, because enforcement would grow
[FireResult](/api/index/type-aliases/FireResult)'s reasons and [GapRecord](/api/index/interfaces/GapRecord)'s, which grow only in
lockstep.

IT NEVER SHARES A WORD WITH APPROVAL. None of the approval vocabulary
(`askId`, `approved`, `declined`, `spent`, `stale`, `APPROVAL_*`) appears on a
decision surface, and none of this feature's vocabulary (`made`, `madeBy`,
`'with-the-human'`) appears on an approval one. One control may carry BOTH
declarations — `confirm: true` and `humanDecides` are independent facts and
both are served — and while a card is open the ask wins the standing word,
because a card is the sharper referent.

## Properties

### about?

> `optional` **about?**: `string`

Defined in: [src/atom/types.ts:328](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L328)

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

***

### doneWhen?

> `optional` **doneWhen?**: [`WhereFilter`](/api/index/type-aliases/WhereFilter)\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/atom/types.ts:349](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L349)

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
