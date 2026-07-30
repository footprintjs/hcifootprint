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

Three siblings of `awaiting-human` complete the ask book, because silence about the other fates
would be the same hole: `approved-not-yet-done` (the human said yes and nothing has fired),
`approval-no-longer-valid` (they said yes and the app's own policy will no longer act on it) and
`declined` (they said no). All four are the pause, said precisely; none of them is a failure, and
the results say that in words (`src/serve/modes.ts`, the `PAUSED_*` constants).

`approval-no-longer-valid` earns its own word rather than sharing `approved-not-yet-done`'s under a
different sentence, and the reason is rule 5 below: the two demand OPPOSITE moves, and one word for
both would have to pick one of them to be wrong about.

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
