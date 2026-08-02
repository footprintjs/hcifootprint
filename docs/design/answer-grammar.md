# The answer grammar — how `did_it_work` says what it knows

Status: LAW. Not a dated decision record (the `dNN-*.md` files record what one numbered decision
decided, at the time); this note states a rule every later build has to keep. Lineage: d21
(confirm receipts) → d22 (materialized fires) → d24 (enforced approval) → **this**.

One tool answers one question — *did the app actually do it?* — and the question has more fates
than "yes" and "no". Each fate gets ONE word, and the words are listed here so a later build
picks the right one instead of a new synonym. A second word for a fate that already has one is
how a model learns that two payloads mean two things when they mean the same thing.

## The vocabulary

| word | what it means | the shape it rides |
| --- | --- | --- |
| `still-pending` | It was fired. The app has not finished, so no outcome exists YET. | `ok: true`, `settled: false`, `judgment: 'still-pending'` |
| `awaiting-human` | Nothing was fired. A human is holding the ask, so no outcome exists AT ALL. | `ok: true`, `settled: false`, `judgment: 'awaiting-human'` |
| the settlement receipt | How the fire came to rest. First settlement wins, and it is never rewritten. | `ok: true`, `settled: true`, plus `effectStatus` / `outcome` / `verifyHeld` |
| `outcomeNow` | The RECORD moved after the receipt was written (a server took the order back). | rides *beside* `outcome`, never over it |
| `arrival` | A navigation CLAIM, and whether an observation has corroborated it. Two values, ever: `'claimed'` and `'observed'`. | rides *beside* the receipt, never over it |
| `materialized: false` | Nothing in the app executed this fire, so every effect on it is a declaration. | rides *beside* the receipt, with the fire-time result's own word |
| `with-the-human` | A decision belongs to a person and is not known to be made. Nothing was fired, no card exists — the human answers through the app's own control. | `journeyStanding`'s standing; the `withTheHuman` list in frame results. Never a `judgment` of `did_it_work` — there is no id to ask it about. |

Three siblings of `awaiting-human` complete the ask book, because silence about the other fates
would be the same hole: `approved-not-yet-done` (the human said yes and nothing has fired),
`approval-no-longer-valid` (they said yes and the app's own policy will no longer act on it) and
`declined` (they said no). All four are the pause, said precisely; none of them is a failure, and
the results say that in words (`src/serve/modes.ts`, the `PAUSED_*` constants).

`approval-no-longer-valid` earns its own word rather than sharing `approved-not-yet-done`'s under a
different sentence, and the reason is rule 5 below: the two demand OPPOSITE moves, and one word for
both would have to pick one of them to be wrong about.

`with-the-human` is deliberately NOT `awaiting-human`, and the distinction is the referent. That
word's referent is an ask CARD — there is an `askId`, a thing the system is holding, and a door the
human answers through that this library rendered. Here the system holds nothing: no card, no id, no
refusal. Borrowing the word would teach a model to go looking for a card that does not exist, and
`did_it_work` is untouched for the same reason — a `humanDecides` suspension mints no transitionId
and no askId, so there is nothing to pass it. *Where does the flow stand?* is `journeyStanding`'s
question and `whats_here`'s, not that tool's.

One refusal belongs to the same grammar: `AMBIGUOUS_ID`, when a single id names both a transition
and a card (possible when an app names an action `ask`). It is not a fate — it is the tool
declining to have one, because either answer would be about the other object.

`arrival` was reserved here one build before it was spent, so the word could not quietly be given
to a different fate. It now has exactly the fate it was reserved for, and exactly two values —
there is no third for "did not arrive", and the reason is the next section's second rule: a sync
somewhere else, or no sync at all, is not evidence of a failed navigation. A later legitimate hop
and a broken one look identical from here, and a session with no sync channel observes nothing at
all, so `'claimed'` simply stands. A clock never turns it into a verdict.

## The one law

> **Late or side-band truth rides ALONGSIDE the settlement receipt, never over it. The receipt is
> never rewritten.**

Already in the code, in `callDidItWork` (`src/serve/modes.ts`) — cited by name, never by line
number, because a line number in a note is stale the first time anyone edits the file:

```ts
// A settlement is a RECEIPT of how the fire came to rest, and first
// settlement wins — so the record can move on afterwards while the receipt
// stands (a server rejecting an order the app already reported flips it to
// 'rolled-back'). … The later word rides ALONGSIDE, never over: the receipt is
// not rewritten, and it appears only when the two genuinely disagree.
const live = session.transitions().find((row) => row.id === transitionId);
const outcomeNow = live?.outcome;
```

`Session.settlementOf` / `settlementIfKnown` hold the same line one layer down: the retained
settlement is handed out detached, and nothing in the session mutates it after the fact
(`src/traverse/session.ts`, `#detachSettlement`).

## What the law forbids

1. **No arm overwrites another arm's word.** A disagreement is served as two fields side by side
   (`outcome` + `outcomeNow`), with the instruction that resolves it. Averaging them into one
   value destroys the only evidence a reader has that anything moved.
2. **No arm guesses.** A question that cannot be answered yet says so and names the next move.
   A timeout is a ceiling on WAITING, never a verdict (`McpServerOptions.settleWithinMs`).
3. **A pause is not a settlement.** Nothing fired, so there is no transition, no `EffectStatus`
   and no `Settlement` — and the ask arms therefore do not borrow those published unions.
   `'awaiting-human'` is a result-level `judgment` string; adding `'awaiting'` to
   `EffectStatus` or `Settlement` (both in `src/atom/types.ts`) would put a word for
   "no transition exists" inside the vocabulary for "how a transition came to rest", which is a
   category error the type would then teach to everyone.
4. **An instruction must name a move the library will accept.** An arm that tells a reader to do
   something the gate is about to refuse — forever, without changing anything the arm can see — has
   built a loop out of two true sentences. Where an arm instructs, it and the gate read the SAME
   function (`approval-no-longer-valid` and `stale()` in `src/traverse/approval-gate.ts`).
5. **Corroboration is not proof.** `arrival: 'observed'` means a matching observation landed, and
   the sentence served with it says exactly that. The sync row that produced it still carries
   `unverifiedEdge: true` — the cursor moved without passing a guard, and nothing in this library
   can see the app's router. An arm that reads "observed" as "this action caused the navigation"
   has upgraded evidence into a verdict.

## What mints a transitionId

> **A `transitionId` is minted only by an executed fire. No paused or refused result ever carries
> one.**

It is the id of a `TransitionRecord`, and a record is built after every gate has already said yes:
the approval gate refuses and returns BEFORE the record exists (`src/traverse/session.ts`), and the
needs-confirm arms return before `fire()` is called at all (`src/serve/modes.ts`). So the presence
of the field is a fact, not a convention — *something actually ran*.

Two things rest on it, and both stop being true the day an arm grows one for tidiness.

**A caller can branch on it.** `whenSettled` / `settledAnswer` / `did_it_work` all key on a
transition, and there is no transition for a question a human has not answered. A pause carries an
`askId` instead, and the two id families are deliberately different words for deliberately
different objects (rule 3).

**An awaited call cannot block on a human.** `mcpServer` folds the settled truth into a result only
when that result carries a `transitionId`, and waits — inside its ceiling — for the settlement of
that id. Give a needs-confirm result a `transitionId` and the server starts waiting on an action
nobody has approved: the tool call now holds the turn open until the ceiling expires, and the model
that was supposed to go and ask a person is sitting on a stopped clock instead. The invariant is
what makes the wait structurally incapable of that, and it is pinned by a test that fails if any
pause or refusal arm ever grows the field.

## How completion is correlated

> **A completion belongs to a call, not to a moment. Correlation is by CALL PATH — never by
> recency.**

There are two rails, and each one carries its own identity:

- **The handler rail.** `fire()` invokes one handler per invocation and holds that invocation's own
  promise. Whatever it returns or throws belongs to that fire because it *is* that fire — nothing is
  matched, so nothing can be mismatched.
- **The state rail.** The app reports a delta from wherever it reports things, and identity has to
  travel with it: `updateState(delta, { transitionId })`. That is the recommendation, and it is the
  only form that is exact.

Without a `transitionId` the library falls back to FIFO — the **oldest** pending fire whose handler
is not still in flight, `src/traverse/session.ts`. Oldest, not newest, and the choice is stated
rather than incidental: a queue answers in the order it was joined, and out-of-order completion is
normal (two fires, the second handler finishing first). FIFO can therefore mis-attribute, which is
why the docs ask for the id and why `effectVerified: false` exists as the designed detector — but
it mis-attributes *predictably*, and a caller can reason about it.

One narrower arm sits **after** that fallback, not in front of it: when *every* outstanding fire's
handler is still in flight, a delta covering exactly one of their declared `writes` settles that one
precisely — an async handler reporting its own writes past its `await`. The precondition is the
whole of it. Mix the queue and bare FIFO answers first, whatever keys the delta carries, and no page
may promise that shape unconditionally: a doc that tells an app author *this shape never needs the
id* has taught the mis-attribution it was written to prevent.

**Recency would be worse than wrong: it would be unfalsifiable.** "Attribute to the most recent
fire" is right exactly when handlers finish in the order they started, which is the one case where
FIFO is right too — and wrong precisely when the timing is interesting, silently, with a
plausible-looking answer. A clock is not evidence of causation any more than it is evidence of a
verdict (rule 2). The FIFO order is pinned by a test so an optimization to "the latest one" fails
loudly instead of quietly.

## What `busy` says, and what no clock may say for it

> **`busy` is the app's own label for "this control is working right now". It is a STATE the app
> reported, never a verdict this library reached — and nothing here will ever time it out.**

A control has three states a person can see: clickable, switched off, and working. Only the first
two had a wire, so working and broken were the same picture from the one reader that cannot see the
screen — and the two moves an agent makes about broken (fire it again, tell the human it failed)
are the two worst moves about working.

The shape is a STRING and only a string, and that is rule 2 applied at authoring time. A boolean
would say *something is happening* and leave the meaning to whoever renders it — which puts this
library in the business of authoring a sentence about a state only the app can describe. So the
value is the app's word, it travels on the DATA channel, and it never enters an authored sentence,
`groundTruth()`, or the facts block. For the same reason there is no declarative `busyWhen`: a
condition can prove a state, but it cannot write prose.

It does not gate anything, and that is rule 3's shape on the other axis. Busy is what the app
*said*, not a door the app *shut*; an app that means "and nobody may press it" disables the
control, and `TOOL_DISABLED` already exists for that. No refusal word was minted — `FireResult`'s
`reason` and its lockstep twin `GapRecord.rejectionReason` do not grow — so a busy control that is
also disabled is refused with the word that was already true, carrying the label as data and one
authored sentence beside the refusal's own. **Alongside, never over**, and the sentence says out
loud that it is not the cause of the refusal it sits next to: two true things the app said, joined
by nothing this library invented.

**The ceiling belongs to the caller.** There is no library timer on `busy`, and there is no state
it could decay into if there were — "it has been a while" is not evidence of *done* and not
evidence of *failed*. A busy that outlives anyone's patience is answered by the row still saying
busy and `did_it_work` still saying `still-pending`, and that pair *is* the truth. A caller that
stops waiting reports **UNFINISHED**. Never done, never failed. This is rule 2 again, and it is
the same answer `McpServerOptions.settleWithinMs` already gives: a ceiling on waiting is a fact
about the waiter.

## What a WORK ROW says, and what it can never close

> **`beginWork` is the app saying *I am working on this, and here is the fire it belongs to*. It
> opens a LEDGER ROW, never a latch: `done()` closes the row and settles nothing.**

`busy` is a fact about a control on screen. This is a fact about a piece of WORK, and it exists
because a fire comes to rest when the app reports its delta — while the app may keep working long
after that. Until this ledger every "what is still live?" door answered *nothing* about exactly
that: `pending()` had settled the record, the settlement latch had been dropped, and the ask book
was never about fires at all. `Session.openWork()` is the third door, beside `pending()` and
`awaitingSettlement()`.

**`done()` settles nothing, and that is the load-bearing part.** The failure spine stays the three
doors it has always been — a handler throw, a returned `{ok:false}`, `reject()` — and a
`done(error)` on a bound row records the error on the WORK row only. Any version where `done()`
resolves a settlement latch forks first-settlement-wins: two independent things racing to write one
receipt, with an app's note about its own bookkeeping able to arrive first and become the library's
verdict on an action. That is rule 1 broken at the source rather than at the serving layer.

**It rides alongside.** When a bound row is open, `did_it_work` adds `stillWorking: true` — on the
`still-pending` arm, and BESIDE the settlement receipt exactly as `outcomeNow` does, because a fire
really can be at rest while the app really is still working. No word in the vocabulary above
changed, and none was added: rule 3, applied to the judgment set the same way it is applied to
`EffectStatus` and `FireResult.reason`.

**Binding is by call path, never by recency** — the rule already written under "How completion is
correlated", now enforced in a second primitive. A row binds to the `transitionId` the caller named,
or to the fire whose handler the call is inside; with neither, it lands UNBOUND at principal
`'system'` with one dev warning, because work never runs silently and a guessed owner is worse than
an absent one.

Two windows are involved and they must stay two, so they are named wherever both appear:

- the **call window** — open only while a handler's synchronous portion runs, answering *which fire
  is this call inside of?* (`#invokingRecordId`, shared with `updateState`);
- the **claim window** — open from a fire until the next fire or the next observation, answering
  *which navigation claim could this observation corroborate?* (`#navClaim`, the `arrival` rail).

Collapsing them would let a late observation attribute a call, or a call close a claim.

**No clock, again.** Nothing expires a work row (rule 2), so an un-closed `beginWork` keeps
answering *still working* and stays visible in `openWork()` for the session's life. That is the
documented failure mode rather than a bug: pair the handle with `try`/`finally`, and if one leaks,
the honest consequence is a row that says what the app last told it. The app's own `label` for the
work rides the DATA channel only — it never enters `groundTruth()`, an authored sentence, or the
facts block, which get an authored constant naming *work it did not tie to an action*.
