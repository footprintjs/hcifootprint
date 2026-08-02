# Human decisions — whose the choice is, and the words for a flow a person is holding

Status: DESIGN (Round A). Nothing here is built; Round B builds exactly this and nothing beyond
it.

> **BUILT in 1.3.0**, as papered. The body below is left exactly as Round A wrote it — it is the
> record of what was decided and why, including the alternatives that were rejected, and editing it
> after the fact would destroy that. What shipped, in this note's own vocabulary mapped through the
> header above: D1–D16 whole, the 30-item test list, and T-A1..T-A12. The open items in D16 stayed
> open. See the CHANGELOG's 1.3.0 section for the shipped surface.

> **Written before the 1.0 rename, and its names are pre-1.0 names.** Read `ToolDef` as
> `ActionDef`, `AffordanceDef` as the flat authoring type it replaced, `skillId` as `journeyId`,
> and `skillStanding` / `skillPlan` as `journeyStanding` / `journeyPlan`. The shapes and the
> reasoning are unaffected — only the words are — and re-spelling a design note after the fact
> would edit a record of what was decided when. The CHANGELOG's 1.0 section carries the mapping. Lineage: d21 (confirm receipts) → d24 (enforced approval) → answer-grammar (LAW — this note
extends it and contradicts nothing) → **this**. Code is cited by FILE NAME, never line number,
per answer-grammar's own rule. Where a wave-5 audit ruling is restated below it is restated as
LAW, not re-opened.

## The hole

`requireHumanApproval` (`src/atom/types.ts`) answers one question: may the agent ACT — a human's
recorded yes unlocks one fire. It says nothing about the other way a person is inside a flow:
some choices are the person's to MAKE — which plan, which shipping speed, whether to sell at all.
The agent's correct move there is to present options and stop; the human answers through the
app's OWN control, and the flow moves because the world moved. Today the library has no word for
that, so a model meets a choice control like any other tool and fires it — or, told not to in
prose, invents its own vocabulary for the pause. Every near word the library does have —
`awaiting-human`, blocked, disabled — describes something the SYSTEM holds: a card, a gate, a
grey button. Here the system holds nothing. There is no card, no gate, no refusal; the flow is
simply in a person's hands, and the library must be able to say so without inventing a gate the
app never declared.

Three surfaces get the vocabulary, decided here ONCE: the declaration (`humanDecides`), the
chain's settled word (`skillStanding`), and the frame lists a model reads every turn
(`frameData` in `src/serve/modes.ts`).

A worked example used throughout: a checkout journey `buy` with steps `enter-address`,
`choose-shipping-speed`, `place-order`. The app declares that shipping speed is the customer's
call:

```ts
'choose-shipping-speed': {
  does: 'Choose a shipping speed',
  writes: ['checkout.shipping'],
  humanDecides: {
    about: 'which shipping speed',                    // app data — rides data fields only
    doneWhen: { 'checkout.shipping': { ne: '' } },    // the app's own "it has been decided"
  },
},
```

---

## D1 — decision-ownership is not approval, and the two never share a word

**Decision.** `humanDecides` and `requireHumanApproval` are kept named apart on every surface.
*Rationale: they answer different questions — approval gates the AGENT ACTING after a human yes;
ownership says the DECISION itself belongs to a person — and one vocabulary for both would teach
a model that presenting options is a form of asking permission.*

Consequences, each of which is a test:

- `humanDecides` mints **no ask, no askId, no card, no receipts**. There are no approve/decline
  doors for it and never will be — the human answers through the app's own control (the sensor's
  observed click, or an attributed `updateState`), not through a yes/no the library renders.
- None of the approval vocabulary (`askId`, `approved`, `declined`, `spent`, `stale`,
  `APPROVAL_*`) ever appears on a `humanDecides` surface, and none of this note's vocabulary
  (`made`, `madeBy`, `with-the-human`) ever appears on an approval surface.
- A control may carry BOTH declarations (`highEffect` + `humanDecides`): the two facts are
  independent and both are served. Where both hold a flow at once, the ask wins the standing word
  while its card is open (D9) — a card is the sharper referent — and ownership governs again once
  no card is open.

## D2 — the declaration: `ToolDef.humanDecides`, compiled onto `Affordance`, mirroring `enabledWhen`

**Decision.** `humanDecides?: { about?: string; doneWhen?: WhereFilter }` is authored on
`ToolDef` (`src/tree/types.ts`) and compiled verbatim onto `Affordance` (`src/atom/types.ts`).
The flat authoring type `AffordanceDef` does NOT grow it. *Rationale: this is `enabledWhen`'s
exact path — authored on the tree tool, carried on the compiled affordance, absent from the
legacy flat authoring surface — and a second path would be a second thing to keep true.*

- `doneWhen` is a plain, serializable `WhereFilter`, evaluated by the same evaluator and under
  the same honesty split as every guard. It is deliberately NOT a predicate: a condition can
  prove a state; only the app's own filter grammar keeps it exportable, explainable and
  composable. Keeping it a plain `WhereFilter` is also what lets F3c (per-edge journey guards,
  PARKED — see D13) compose with it later without a migration.
- `doneWhen: {}` is refused loudly at build — the same `rejectEmptyFilter` /
  `validateGuardShape` treatment `enabledWhen` gets in `src/tree/appmap.ts`, because footprint's
  evaluator deliberately never matches an empty filter and a declaration that can never hold is
  an authoring bug.
- `doneWhen`'s keys join `requiredStateKeys()` (`src/tree/types.ts`). *Rationale: a projector
  that never seeds them leaves `made` at `'unknown'` forever — honest, but degraded — and
  `requiredStateKeys()` exists precisely to tell the app which keys make its own declarations
  decidable.*
- `humanDecides` with `doneWhen` omitted is legal: it declares ownership while admitting the app
  gave the library no way to know when the decision lands. Its `made` is `'unknown'` forever
  (D5) — absence of a condition is absence of knowledge, never a verdict.

## D3 — `about` is app DATA: capped, carried, never spoken

**Decision.** `about` rides structured data fields only — `decisions()` rows, the
`withTheHuman` list rows — and never enters an authored sentence, `groundTruth()`, or the facts
block. It is length-capped at 200 characters, refused LOUDLY at build when over. *Rationale:
the facts block admits no runtime-class text (the `WorkRow.label` law in `src/atom/types.ts`),
and a build-time refusal is kinder than silent truncation for a string the author can fix once.*

The authored `does` description already names the control in the planner-facing string class;
`about` exists for the app's own domain phrasing ("which shipping speed") and stays in the data
channel exactly as `busy` labels and work labels do.

## D4 — the stamp: presence-only `humanDecides: true` on `AvailableEdge` and served rows

**Decision.** `AvailableEdge` (`src/atom/types.ts`) gains `humanDecides?: true` — presence-only,
the `materialized: false` / `relayed: true` stamp pattern — and every Mode B rendering of an
action row (`edgeData` in `src/serve/modes.ts`, `whats_here` action rows) carries it.
*Rationale: presence is the whole claim (the `enabled`/`busy` law): a key means the app declared
ownership; NO key means no ownership was declared — never "the agent's to make", which the
library cannot know.*

The edge does not re-serve `doneWhen` (a served row carries verdicts and stamps, not filters —
the same reason `enabledWhen` itself never rides the edge) and does not carry `about` (the
decision surfaces D5/D10 carry it; an action row stays lean). There is deliberately no
`humanDecides: false`.

## D5 — the reader: `session.decisions()`, sibling of `asks()`

**Decision.** `Session.decisions(): DecisionStatus[]` — one row per affordance in the compiled
graph that declares `humanDecides`, whatever node it lives on, read at the moment you ask.
*Rationale: it is the sibling of `asks()` ("is anything waiting on a person?"), and a decision on
another page still holds a journey; the name is NOT `awaiting()` — that word collides with
`awaitingSettlement` and the ask book's claimed vocabulary.*

```ts
export interface DecisionStatus {
  affordanceId: string;
  about?: string;                    // app data, capped (D3)
  made: boolean | 'unknown';         // evaluated live against projected state
  madeBy?: Principal;                // ONLY via the attribution ladder (D6)
}
```

`made`, evaluated fresh on every call from `doneWhen` against the session's projected state:

- **`true`** — `doneWhen` holds.
- **`false`** — `doneWhen` was evaluated and does not hold. Only an evaluable, failing condition
  may say this.
- **`'unknown'`** — `doneWhen` cannot be evaluated (a key absent from the state view, or holding
  `undefined` — the same rule `guardUnevaluated` applies to guards), or no `doneWhen` was
  declared at all. **Never collapsed into "not yet"**: `'unknown'` and `false` are different
  answers to different questions, exactly as an unevaluable guard is served with a marker rather
  than treated as failed. This is the `guardUnevaluated` asymmetry applied to decisions, and it
  is pinned by an attack test (T-A3).

No per-instance rows in v1: the declaration is affordance-level and `doneWhen` reads flat
projected-state keys. An app modelling per-row decisions models them in its own keys. Stated
limit, not a roadmap promise.

## D6 — THE resumption law: `madeBy` rides only identity, and a chat-typed "done" cannot become it

**Decision.** `madeBy` is served beside `made: true` only, and it is minted from exactly the
identity-bearing rungs of `updateState`'s documented attribution ladder
(`src/traverse/session.ts`) — never from its matching rungs. *Rationale: correlation is by call
path, never by recency (answer-grammar, "How completion is correlated") — a guessed owner on a
human decision is the one guess this library must be structurally incapable of.*

The session keeps a **decisions book**: per `humanDecides` affordance, the attribution of the
LATEST committed delta that touched any `doneWhen` key. Recorded at commit time — the only
moment attribution is knowable — in the footprint house style (collect during traversal, never
post-process). Set-or-clear on every touch:

| the delta arrived through | book entry |
| --- | --- |
| `updateState(delta, { transitionId })` naming a fired transition | that fire's recorded principal (`FireOptions.source` — typed, required) |
| the handler's own call window (`#invokingRecordId` — the report is that fire's by construction) | that fire's recorded principal |
| `updateState(delta, { principal })` — the attributed/stimulus door | the caller's stated principal, verbatim |
| FIFO settle, the single-cover arm, effect-signature inference, the unknown-stimulus floor | **CLEARED** — no principal, whatever it held before |

`decisions()` serves `madeBy` = the book entry, iff `made` is `true` and an entry exists.
Everything else is ABSENT — never inferred, never defaulted, and **never `'user'`** unless a
door that carries identity said `'user'`.

Why the three rungs and only the three: the first names the fire, the second IS the fire
("nothing is matched, so nothing can be mismatched"), the third names the principal outright.
The matching rungs compute a join — FIFO can mis-attribute predictably, the single-cover arm is
a signature match, inference is a guess the record itself flags (`Cause.inferred`) — and a
computed join never attributes a human decision. A transition whose cause carries
`inferred: true` never mints an entry on any path, belt and braces.

Consequences, each an attack test:

- **An unattributed delta that flips `doneWhen` serves `made: true` with `madeBy` ABSENT** —
  the decision is visibly made and nobody is named. Absence is the honest answer, and "silence
  never a verdict" cuts both ways: the library does not say the human did it, and does not say
  they didn't.
- **A chat-typed "done" is structurally incapable of laundering into attribution.** A sentence
  in conversation reaches no session door: the Mode B port exposes no tool that calls
  `updateState`, and every fire through the port carries the port's construction-time `source`
  (default `'agent'`, `src/serve/modes.ts`). The only ways `'user'` enters the book are the
  app's own doors: the sensor's observed trusted click (`src/sensor/watch-page.ts` fires
  `source: 'user'`, record-only), an app handler's attributed report, or a fire the app itself
  stamps `'user'`. No new sensor work is needed — the no-injection coupling already carries the
  human's act.
- **An agent that fills the decision is disclosed as the agent.** v1 does not refuse the fire
  (D14): the fire records principal `'agent'`, the flip mints `madeBy: 'agent'`, and the
  disclosure IS the v1 posture — the app and the person can see, in the book, that the agent
  made a decision it was told to leave alone.
- **A stale stamp never survives an unattributed touch.** Human picks `standard`
  (attributed, `madeBy: 'user'`); an unattributed delta later rewrites the key to `express`
  while `doneWhen` still holds — the book CLEARS, `madeBy` goes absent. The alternative
  attributes the new value to a person who never chose it.
- Initial state already satisfying `doneWhen` serves `made: true`, `madeBy` absent — the world
  arrived decided; nobody in this session decided it.

## D7 — the library NEVER auto-fires on `made: true`

**Decision.** Nothing in the library fires, resumes, advances a frame, or invokes anything when
a decision becomes made. Resumption is the caller's act. *Rationale: `made: true` is a state
reading, not a command — a library that acts on it has turned a disclosure into a trigger, and a
mis-attributed delta would then perform actions, not just mislabel them.*

In the wired app the natural resumption needs no machinery at all: the human's answer IS a click
on the app's own control, the sensor records the fire, the step commits, and the held lists
empty because the step is done. The `made: true`-but-not-done residue exists only for tap-only
decision keys, and there the caller (the agent reading `made: true`, or the app) moves the flow
itself. No timer exists here either: nothing expires a decision, nothing flips `made` by clock —
a clock is never evidence (answer-grammar, rule 2).

## D8 — the word: `'with-the-human'`

**Decision.** The humanDecides suspension is named **`'with-the-human'`** — the standing word,
the frame-list key (`withTheHuman`), one fate one word everywhere. *Rationale: plain possession
in ordinary speech ("it's with legal now") that says exactly what is true — the flow is in a
person's hands — while `'awaiting-human'` stays what C3 ruled it to be: the word whose referent
is an ask CARD; here there is no card, no askId, nothing the system holds, so borrowing
`'awaiting-human'` would teach a model to go looking for a card that does not exist.*

Rejected candidates, so the next build does not re-litigate: `human-deciding` (describes an
activity nobody can observe), `needs-human` / `needs-a-person` (reads as approval — D1),
`human-owned` (describes the declaration, not the standing), and any number-suffixed or
synonym-adjacent form (a second word for a fate that already has one is how a model learns two
payloads mean two things when they mean one).

The answer-grammar vocabulary table gains one row (Round B applies the edit to
`docs/design/answer-grammar.md`; this note is its source):

| word | what it means | the shape it rides |
| --- | --- | --- |
| `with-the-human` | A decision belongs to a person and is not known to be made. Nothing was fired, no card exists — the human answers through the app's own control. | `skillStanding`'s standing; the `withTheHuman` list in frame results. Never a `judgment` of `did_it_work` — there is no id to ask it about. |

`did_it_work` is deliberately untouched: a humanDecides suspension mints no transitionId and no
askId (answer-grammar, "What mints a transitionId"), so there is nothing to pass it. The
question "where does the flow stand?" is `skillStanding`'s and `whats_here`'s to answer.

## D9 — `skillStanding(skillId)`: the chain's settled word, as a pure fold

**Decision.** `Session.skillStanding(skillId): SkillStanding` — a pure derived fold over
skillPlan + the ask book + the decisions book + retained settlements + frame history. No state,
no timer, never fires, computes fresh on every call; unknown ids THROW exactly as `skillPlan`
does (`src/traverse/session.ts`), and serving layers resolve names first — the existing
`trySkillPlan` precedent covers reach-in callers, and no `trySkillStanding` is minted until a
consumer asks. *Rationale: the standing must be un-cachable truth about NOW, and a fold that
holds state would be a second place the truth lives.*

```ts
/** NEW published type — its strings are data on THIS type; no existing union grows. */
export interface SkillStanding {
  skillId: string;
  standing: 'done' | 'in-progress' | 'awaiting-human' | 'with-the-human'
          | 'blocked' | 'failed' | 'declined';
  evidence: {
    /** The governing step (first not-done step in chain order), where one exists. */
    step?: string;
    askId?: string;                    // 'awaiting-human' / 'declined' — the card
    about?: string;                    // 'with-the-human' — app data
    made?: boolean | 'unknown';        // 'with-the-human'
    madeBy?: Principal;                // 'with-the-human', from the book (D6)
    blockedOn?: FilterCondition[];     // 'blocked' — the failing conditions
    guardUnevaluated?: string[];       // taken-on-faith marker, carried not resolved
    transitionId?: string;             // 'failed' — a POINTER to the settled fire
    stepsDone: number;
    stepsTotal: number;
  };
}
```

The fold, stated as the walk it is:

1. An OPEN frame for the skill governs; else a latest-closed `'completed'` frame answers
   `'done'`; else the frameless plan is walked (a cancelled or demoted frame contributes
   history, never a verdict — abandonment is not completion and not failure).
2. Walk steps in chain order. The FIRST step not `'done'`/`'inferred-done'` is the governing
   step, and its hold names the standing:
   - its latest ask is OPEN → **`'awaiting-human'`**, evidence `{ askId, step }` — the C3-legal
     use: the referent is a card;
   - its latest ask was DECLINED through the human's own door → **`'declined'`** (a relayed
     decline closes nothing and therefore governs nothing — the card is still open and the
     standing stays `'awaiting-human'`);
   - it declares `humanDecides` and would otherwise be ready → **`'with-the-human'`**, evidence
     `{ step, about?, made, madeBy? }` — including `made: true`, which is the resumption cue
     said in data;
   - its LAST attempt came to rest badly — a retained settlement with `effectStatus 'refused'`,
     or an outcome `rejected`/`rolled-back` — with no later success → **`'failed'`**, evidence
     carrying the `transitionId` pointer (the receipt itself is `did_it_work`'s to serve, once);
   - its status is `'blocked'` with EVALUATED failing conditions → **`'blocked'`**, evidence
     `blockedOn`;
   - otherwise (`'ready'`, `'off-node'`, or blocked only by unevaluable keys) →
     **`'in-progress'`**, with `guardUnevaluated` carried when present — taken-on-faith is not
     blocked, the same asymmetry everywhere else.
3. Every step done → **`'done'`**. A skill never started walks arm 2 like any other —
   `'in-progress'` with `stepsDone: 0` is the honest reading of "open, and nothing holds it";
   the evidence counts say plainly that nothing has fired.

**`'failed'` is NEVER minted from any pause** — not from `needs-confirm`, not from a relayed
decline, not from any `APPROVAL_*` refusal, not from a guard/disabled/materialization refusal.
A refusal is not an execution: nothing ran, so nothing failed (the same line "What mints a
transitionId" draws). `'failed'` requires a fire that actually came to rest badly. Attack test
T-A6.

`standing` strings live on this NEW type only. `EffectStatus`, `Settlement`, `StepStatus`,
`FrameStatus`, `FireResult['reason']`, `GapRecord['rejectionReason']`, `GapReason` and the
`Binding` kinds stay byte-identical — the reason `agentMay` enforcement is out of v1 entirely
(D14) is that enforcement mints refusal words and `FireResult.reason` /
`GapRecord.rejectionReason` grow only in lockstep, which is forbidden.

## D10 — frame results: held steps leave `readySteps`, each hold under its own list

**Decision.** In `frameData` (`src/serve/modes.ts`), the ready bucket splits three ways, and a
held step is never advertised as fireable:

- a step whose affordance has an OPEN ask → **`awaitingHuman: [{ askId, step }]`**;
- a step whose affordance declares `humanDecides`, until that step is done →
  **`withTheHuman: [{ step, made, about? }]`** — `made: true` rows stay listed (the step is
  still the person's; the row itself is the resumption cue) and leave only when the step is
  done or inferred-done;
- everything else → `readySteps`, unchanged.

*Rationale: the existing `awaitingState` precedent in the same function — "advertising it would
instruct the model to double-fire" — makes moving a held step out of the ready list the
pattern-conforming shape; a step listed under `readySteps` IS an instruction to fire it.*

- The exclusion is DISCLOSURE, not enforcement: `fire()` still accepts the step (D14), no
  refusal word exists, and the ask-wins ordering matches D9's walk (an open card outranks the
  ownership stamp while it is open).
- When `withTheHuman` is non-empty the result carries one authored companion constant,
  `withTheHumanMeans` — the `stillWorkingMeans` / `arrivalMeans` pattern — saying: these steps'
  decisions belong to the human; present options if asked and do not perform them; the human
  answers in the app; `made: true` means they have answered, and nothing fires by itself.
  (Exact sentence authored in Round B; it is a constant, capped by nothing because it is ours.)
- A humanDecides step that is blocked or off-node is NOT "with the human" yet — it stays in
  `laterSteps`, which gains the presence stamp on such rows (`humanDecides: true`), so every
  rendering of the step tells one story (the every-rendering rule `RedactedFields` follows).
- `SkillPlanStep` (`src/atom/types.ts`) gains the presence stamp `humanDecides?: true` so the
  serve layer reads it off the plan instead of re-deriving it per row. `StepStatus` does NOT
  grow — frozen union; the hold is a list membership, not a status word.
- **Coordination note for Round B:** another wave-5 slice edits the same `readySteps` `.map()`
  block (the `goesTo` work). Whichever lands second rebases onto the other's map consciously —
  the bucket split above restructures the surrounding function.

## D11 — the facts block: one authored constant, ownership only

**Decision.** `groundTruth()` (`src/traverse/session.ts`) prints ONE authored constant per
humanDecides control that is OFFERED at the current position and not known made
(`made` ≠ `true`), rendered through `#actionLabel` — the registry mechanism, the only
interpolation the facts block allows:

> `A decision is with the human: <actionLabel> — the agent presents options and does not make it.`

*Rationale: the line asserts OWNERSHIP only — it claims nothing about `made`, so
`false` and `'unknown'` print the same true sentence and nothing collapses; the made-state
split rides the data channel (`decisions()`, `withTheHuman` rows), where the asymmetry test
pins it.*

- `about` never enters the line (D3). No askId-style suffix exists because no id exists.
- Scope is offered-here (the same `available()` view every serving surface reads): facts
  describes the room the person is standing in; decisions elsewhere are `decisions()`'s and the
  skill tool's to carry.
- Capped by the SAME `maxAttempts` dial that already bounds the awaiting-ask lines
  (`GroundTruthOptions`, `src/atom/types.ts`) — one dial says how long this block may get.
  These lines are authored-declaration-bounded (a model cannot mint them), but the block a
  model trusts above its own account stays bounded by one number regardless.
- No line for `made: true` in v1: the block records what happened, and "made" without a named
  maker is a state reading the data channel already serves. A made-line gated on an attributed
  `madeBy` is recorded as an open item (D16), not built.

## D12 — Mode B serves one word from one derivation, and never re-serves a card

**Decision.** Both doors serve the SAME standing from the SAME `session.skillStanding()` call —
never a re-derivation in the serve layer (the `AskStatus` "same function the gate uses"
precedent, so two doors cannot disagree about one chain):

- `whats_here`: each skills row gains `standing: <word>`; each actions row carries the D4 stamp.
  The facts text (D11) rides `facts` as it already does.
- the skill tool: the result gains `standing: <word>` beside the existing per-turn `judgment`
  words. The two coexist because they answer different questions — `judgment` is "what is my
  move this turn", `standing` is "where does this chain stand" — and the doc-level distinction
  is what keeps the grammar's one-word-per-fate rule intact.
- **Paused and standing answers NEVER re-serve receipts.** `awaitingHuman` rows carry
  `{ askId, step }` and nothing else; `withTheHuman` rows carry `{ step, made, about? }` and
  nothing else; `SkillStanding.evidence` carries POINTERS (`askId`, `transitionId`), never the
  receipts pack — the receipts belong to the ask that minted them, and a payload a model can
  fetch twice is a payload it can quote as new (`src/serve/modes.ts`, the `pausedAnswer` law).
- The tool ARRAY stays byte-identical: no new tool, no schema change, disclosure rides the
  result channel — the Mode B cache law holds untouched.

## D13 — the per-step carrier, decided once; F3c stays parked

**Decision.** Per-step conditional metadata on a journey has exactly ONE authoring carrier: the
object element form of `JourneyDef.steps` (`src/tree/types.ts`) —
`steps: Array<string | { step: string }>` — defined in this build carrying NOTHING beyond
`step`. *Rationale: two features now orbit per-step conditionals (this wave's `doneWhen`-driven
holds; F3c's per-edge guards, PARKED); deciding the carrier once means F3c lands as one new
optional field on an existing shape instead of a second shape.*

- **F3c (per-edge journey guards) stays parked.** Its `when` will ride the object element when
  it unparks; `doneWhen` stays a plain `WhereFilter` on the CONTROL precisely so the two compose
  by AND at that point with no migration. Said here so Round B builds neither.
- `humanDecides` itself is deliberately NOT per-step: ownership is a fact about the CONTROL,
  declared once on `ToolDef` and inherited by every journey that names the control — a
  per-journey split would let two lists disagree about one control's owner. If a
  journey-contextual override is ever warranted, the carrier for it is already decided (the
  object element); recorded as an open item (D16), not built.
- The SERVED carrier is `SkillPlanStep` (D10's stamp): per-step conditional facts ride the plan
  row beside `blockedOn`/`guardUnevaluated`, which is where every existing per-step conditional
  fact already lives.

## D14 — enforcement is FORBIDDEN in v1; v1 is disclosure

**Decision.** No `agentMay` gate ships in this wave: an agent fire of a humanDecides control is
NOT refused, and no refusal vocabulary is minted. v1 is the stamp (D4), the reader (D5/D6), the
standing (D9), the lists (D10), and the facts line (D11). *Rationale: enforcement mints refusal
words, and `FireResult.reason` / `GapRecord.rejectionReason` grow only in lockstep — forbidden
for this wave; disclosure needs no new refusal and already makes the violation visible
(`madeBy: 'agent'` in the book, the fire in the transitions log, the stamp on the row the model
read before firing).*

**Open item (future wave):** whether a session option in the `requireHumanApproval` family
should refuse agent fires of humanDecides controls, with its own typed reason added to BOTH
unions in lockstep, a gap-ledger triage note (security row, not demand), and an answer-grammar
entry. Not designed here; recorded so the next wave starts from this paragraph instead of from
zero.

## D15 — layering against `blockedBecause.clearedBy: 'user'` (Round B statement; build nothing)

One scenario, two controls: `place-order` is blocked until a person picks a shipping speed. Two
declarations could each carry the human-fact — `humanDecides` on the CHOICE control
(`choose-shipping-speed`), and a blocked-reason `clearedBy: 'user'` on the BLOCKED control
(`place-order`). **The layering law: the fact has ONE home — the control the person answers
through.** `humanDecides` on the chooser is the declaration; the blocked control's guard
(`place-order.when` reading `checkout.shipping`) already ties the two mechanically, and a
`clearedBy: 'user'` on `place-order` would encode the same fact a second time — two authored
statements about one truth, free to drift apart. Apps declare ownership once, on the chooser;
whether the blocked side may DERIVE "cleared by a person" from the guard-key overlap with a
declared `doneWhen` is Round B's design to make, and nothing about it is built or promised
here.

## D16 — additive and severable, plus the open items in one place

**Decision.** An app that declares nothing sees byte-identical behavior: every new key is
absent, `decisions()` returns `[]`, `frameData` emits no new lists, `groundTruth()` prints no
new lines, and `skillStanding` — the one unconditionally-new surface — is a new method that
touches nothing. *Rationale: the boundary law — declarations additive and severable — and the
non-breaking test suite exists to pin exactly this.*

Open items recorded (none built in Round B): the enforcement gate (D14); a facts made-line
gated on attributed `madeBy` (D11); a journey-contextual `humanDecides` override on the step
carrier (D13); per-instance decisions on repeats containers (D5).

---

## The test list (Round B builds all of these; FULL suite green before finishing)

New files `test/human-decisions.test.ts`, `test/skill-standing.test.ts`; Mode B additions in
`test/modes.test.ts` (or a sibling `test/with-the-human.test.ts` if it outgrows it); facts
additions in `test/ground-truth.test.ts`; pin additions in `test/non-breaking.test.ts`.

**Declaration and compile**
1. `ToolDef.humanDecides` compiles onto the `Affordance` verbatim; the served edge carries
   presence-only `humanDecides: true`; an undeclared control serves NO key (never `false`).
2. `doneWhen: {}` is refused loudly at build (empty-filter law, `enabledWhen` parity).
3. `about` over 200 characters is refused loudly at build.
4. `doneWhen` keys appear in `requiredStateKeys()`.
5. The flat `AffordanceDef` does not accept the field (`enabledWhen` parity).
6. `JourneyDef.steps` accepts the object element form `{ step }` and compiles identically to
   the string form; nothing else rides it (F3c parked).

**`decisions()` and `made`**
7. No `doneWhen` declared → `made: 'unknown'` forever, never `false`.
8. Evaluable failing condition → `made: false`; holding condition → `made: true`.
9. `made` re-evaluates live: a flip back (`doneWhen` stops holding) serves `made: false` with
   `madeBy` absent; a fresh attributed flip re-mints.
10. `about` rides the row verbatim as data; `instance`-free shape pinned (stated v1 limit).
11. Rows exist for declarations on OTHER nodes (the book is graph-wide, like `asks()`).

**Honesty-stress attacks, named**
- **T-A1 `attribution-only-through-identity`** — a delta with `transitionId` naming the user's
  fire → `madeBy: 'user'`; the handler's own call-window report → the fire's principal; an
  attributed `updateState({...}, { principal: 'user' })` → `'user'`.
- **T-A2 `unattributed-flip-serves-no-maker`** — FIFO-settled, single-cover-settled,
  signature-inferred, and unknown-stimulus deltas each flip `doneWhen` → `made: true`,
  `madeBy` ABSENT on every path; never `'user'`, never a default.
- **T-A3 `unknown-is-not-not-yet`** — unevaluable `doneWhen` (missing key, and separately a key
  holding `undefined`) → `made: 'unknown'`, provably distinct from `false`; the frame row and
  the standing evidence carry `'unknown'` through unchanged.
- **T-A4 `chat-done-cannot-launder`** — no Mode B tool reaches `updateState`; a port fire
  satisfying `doneWhen` serves `madeBy: 'agent'` (the port's source), never `'user'`; a
  conversation with no delta changes nothing.
- **T-A5 `stale-stamp-does-not-survive`** — attributed `'user'` flip, then an unattributed
  rewrite of a `doneWhen` key while it still holds → `madeBy` ABSENT.
- **T-A6 `no-failed-from-any-pause`** — needs-confirm outstanding, a relayed decline, each
  `APPROVAL_*` refusal, `GUARD_FAILED`, `TOOL_DISABLED`, `NOT_MATERIALIZED`: `skillStanding`
  never says `'failed'`; only a refused/rejected SETTLEMENT mints it (and then evidence carries
  the `transitionId` pointer).
- **T-A7 `never-auto-fires`** — `made: true` lands (every attribution path): zero new
  transitions, zero handler invocations, no frame motion, no version bump beyond the delta's
  own.
- **T-A8 `no-card-no-ids`** — a humanDecides suspension mints no askId and no transitionId
  anywhere; `did_it_work` has nothing to be asked and the held rows carry no such keys.
- **T-A9 `receipts-never-re-served`** — deep-assert `awaitingHuman` rows, `withTheHuman` rows,
  `skillStanding` results, and standing-bearing `whats_here`/skill results contain no
  `receipts` key on any path; the receipts pack appears exactly once, on the ask result that
  minted it.
- **T-A10 `no-timer-anywhere`** — with an injected clock (`SessionOptions.now`), no advance of
  time changes `made`, `madeBy`, any list membership, or any standing.
- **T-A11 `vocabulary-firewall`** — `about` and the app's runtime strings never appear in
  `groundTruth().text` or any authored sentence; approval words never appear on decision
  surfaces and vice versa (D1).
- **T-A12 `frozen-unions-stay-frozen`** — compile-time pins: `FireResult['reason']`,
  `GapRecord['rejectionReason']`, `EffectStatus`, `Settlement`, `StepStatus`, `FrameStatus`,
  `GapReason`, `Binding['kind']` byte-identical; the standing strings live only on the new
  `SkillStanding` type.

**`skillStanding`**
12. Pure fold: two consecutive calls mutate nothing (no version bump, no records, no book
    writes) and agree with each other.
13. Governing-step selection: first not-done step in chain order; `stepsDone`/`stepsTotal`
    counts correct with inferred-done counted as done.
14. Open ask on the governing step → `'awaiting-human'` with `{ askId, step }`.
15. Human-door decline (latest ask) → `'declined'`; a NEWER open ask on the same step wins back
    `'awaiting-human'`; a relayed decline leaves `'awaiting-human'` standing.
16. humanDecides governing step → `'with-the-human'` with `{ step, made, about?, madeBy? }`,
    including the `made: true` resumption row; ask-wins ordering when both hold (D1).
17. All steps done → `'done'`; completed frame history → `'done'`; cancelled/demoted frames
    fall through to the live walk.
18. Never-started skill → `'in-progress'` with `stepsDone: 0` (evidence says nothing fired —
    not a guess).
19. Evaluated failing guard → `'blocked'` with `blockedOn`; unevaluable-only guard →
    `'in-progress'` carrying `guardUnevaluated` (the asymmetry at the standing grain).
20. Unknown skillId throws, `skillPlan` parity; Mode B never routes an unresolved name into it.

**Frame lists and Mode B**
21. Ask-held step leaves `readySteps` → `awaitingHuman: [{ askId, step }]`; returns when the
    ask closes.
22. humanDecides step NEVER enters `readySteps`; listed in `withTheHuman` with `made`; leaves
    the list only when done/inferred-done; the human's own sensed click completes the step and
    empties the list with no library act.
23. `withTheHumanMeans` (authored constant) rides exactly when the list is non-empty.
24. Blocked/off-node humanDecides steps stay in `laterSteps` WITH the presence stamp;
    `SkillPlanStep.humanDecides` stamp present on plan rows.
25. `whats_here` skills rows carry `standing`; actions rows carry the stamp; both doors serve
    the identical word for the same chain in the same state (one derivation).
26. `judgment` and `standing` coexist without contradiction on the held result
    (`navigate-or-wait` beside `with-the-human`).
27. The tool array is byte-identical before/after this feature (cache law pin).
28. Fires of humanDecides controls still succeed for every principal (v1 disclosure, D14) and
    the gap ledger gains no new rejection word.

**Severability and facts**
29. A graph with zero declarations: byte-identical serving (snapshot parity against the
    pre-feature fixtures), `decisions()` → `[]`, no new facts lines, no new lists.
30. Facts line prints for offered-here unmade AND unknown decisions through `#actionLabel`;
    made or elsewhere or guard-hidden → no line; capped by the `maxAttempts` dial; `about`
    absent from the text (T-A11 overlap, asserted here on the line itself).
