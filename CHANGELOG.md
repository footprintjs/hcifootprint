# Changelog

## [Unreleased]

### `redactedFields` — the redaction `redactedKeys` never did

`redactedKeys` was consulted for **state keys** and nowhere else. So the data a transition
carries rode out untouched: a handler's return value reached the model through
`producedFor()`, the settlement and the wire; `TransitionRecord.payload` reached every
export door; and 0.7.0's `willUse.input` put the fire's input on the receipts a model
relays and into the exported confirm journal. The library documented the gap in its own
voice — *"redactedKeys governs state keys, never payloads"* — and it matters more the
moment an app returns real data through a handler.

**New, opt-in:** `createSession({ redactedFields: { payload: […], produced: […] } })`.
Dot paths (footprintjs's own `RedactionPolicy.fields` grammar), applied at the three points
where a value lands on something a caller can reach: the record's `payload`, the record's
`produced`, and the receipts' `willUse.input`. A named field that is present arrives as the
literal `'[REDACTED]'` — exported as `REDACTED`, the same marker a redacted state key
already shows in guard evidence.

- **Aimed per channel, on purpose.** `payload` governs every rendering of what a fire
  carries — the record *and* the approval card, because a field hidden from the log that
  still rides the card is not hidden. `produced` governs what a handler returns. Two lists
  rather than one, so "hide the token the API returned" can never quietly blank the amount
  on somebody's confirm card.
- **The consent gate is untouched, and it is tested.** The ask binds to a faithful detached
  copy (`bound-input.ts`) and the gate compares the fire against *that*, never against the
  rendered receipts — so an approved fire still crosses, a laundered one is still
  `APPROVAL_MISMATCH`, and a marker cannot turn a mismatch into a match.
- **A marker, never a drop.** An absent or `undefined` field stays absent (marking it would
  announce a secret that was never sent); `null` is marked; a value the library cannot read
  faithfully — a `Map`, a class instance — is hidden **whole** rather than reached into.
- **The human and the model are not separable here**, said plainly in the docs: one receipts
  pack goes to one caller, and over Mode B that caller is the model. Aim `payload` at fields
  a person does not need in order to judge the action.
- **Nothing changes unless you ask.** Absent, 0.7.0 behaviour is byte-identical — including
  the payload's reference identity on the record — pinned by its own describe block.

### `hcifootprint/sensor` — every real human click on the ledger, with no shim

An agent's actions land on the ledger by themselves. A **person's** did not, unless the app
wrote a `humanFire` call per control — one integration counted 53 lines of shim across 21 call
sites, each one a place to forget `invoke: false` and run the click twice.

**New subpath, zero dependencies, no framework required:** `watchPage(session, { root })`
attaches one delegated capture-phase listener set to the page. The watch-list **is**
`session.available().edges` and the `binding` each one carries — no selector map, no id
registry, no instrumentation config, ever. It reaches the engine through a type-only port, so
importing it drags no session machinery and no footprintjs (11.9 KB minified, pinned in
`test/treeshake.test.ts`).

- **The app declares the value; the sensor never reads one.** The DOM is a *rendering* of the
  app's state, not the state — scraping it fails silently, differently per component library,
  and as a plausible-looking value, which is indistinguishable from a right one once it is on
  the ledger. So a payload rides a fire only from `ControlDeclaration.value()`, and otherwise
  there is **no `payload` key at all** — never `payload: undefined`, never `{}`, never `''`,
  which is the shape that once overrode an app's own authored default. The members a scraper
  would need (`checked`, `form`, `children`, a per-control `name`) are absent from the element
  port: an absent surface rather than a rule to remember. A declared value is still validated
  by the app's own schema at the door, because that gate is source-blind.
- **Two evidence levels, and the order is the design.** DECLARED (`attach()` — object identity,
  may carry a value and an instance) beats RECOGNISED (role + accessible name against the
  graph's own locators, which may never carry a value). Unique → reported; two or more →
  refused, never picked.
- **Record-only in the type system.** `RecordOnlyFire` pins `invoke` to `false`, so an
  executing fire is *inexpressible* rather than discouraged. No engine change was needed.
- **One human act, one row** — three collisions, three named answers: `reportedElsewhere` for
  an app that still reports some edges itself (read once, both levels, `blocked: 'door'` in
  coverage); silence for a known control reached at a moment that is not its own (Enter on a
  button, whose real moment is the click the browser generates next); and a one-task turn
  window for a duplicate delivery of one act.
- **The agent's own clicks are not human acts.** `isTrusted` is read, and the decline **names
  the edge it declined** so a team can delete their own filter and watch this one catch the
  same events. The comment on `defaultTrust` names the seam where a future one-door `perform()`
  makes the whole class unreachable rather than merely detectable.
- **Cadence is a library policy:** `'commit'` (the default — one `change` listener, no `blur`
  beside it), `{ debounceMs }` (coalesced, last value wins, read late so nothing is buffered),
  or `'per-keystroke'`. Per watcher, overridable per control. The clock comes from the root's
  own view or `options.timers`, and a debounced cadence with no clock is **refused**
  (`cadence-unavailable`), never quietly downgraded.
- **Honest, or silent.** Eight typed report arms, none of which writes a guessed row, plus
  `coverage()` — one row per served edge, watching or unwatched with the sentence saying why
  and which of three walls it hit (`gesture`, `payload`, `door`).
- **SSR-safe by compiler.** `root` is required and the port is structural; a probe compiles the
  real `HTMLElement`/`Document`/`ShadowRoot`/`Window` against it, and a sibling probe proves
  `lib: ["ES2022"]` still refuses a browser global.

Purely additive: a new `exports` entry, no existing specifier changes meaning. 251 new tests
(1032 → 1283), each behaviour with its own mutation proof.

## [0.7.0] - 2026-07-30

**An approval the library cannot prove is not an approval** — the sentence this release is
measured by. A security release, entirely **opt-in**: without `requireHumanApproval` the
behaviour is byte-identical to 0.6.0 (one field excepted, named below), so a 0.6 consumer
is unaffected until they set the option.

### `requireHumanApproval` — Approve stops being something the agent can claim

A production integration reported it, and it verified at source:
`fire('p.submit', { source: 'agent', confirm: true })` executed with an EMPTY confirm
journal. `confirm: true` was the AGENT asserting that approval happened — a boolean
in the model's own tool arguments, tied to no recorded decision — so a model that
skipped the ask was indistinguishable from one that got a yes. Two structural facts
underneath it: nothing in the library could RECORD a human approval (the only writer
of an `'approved'` row was `fire()` itself, stamping the FIRING principal on the row
that claimed to authorize it), and a direct in-process `session.fire()` ignored
`confirm` entirely — a real trust boundary, documented nowhere.

**New, opt-in:** `createSession({ requireHumanApproval: true })`. A high-effect AGENT
fire is then refused unless it carries `FireOptions.askId` — a pointer to a journal row
your own Approve control recorded — or a standing grant covers it. The proof is never a
boolean the model sets; `confirm` is deliberately absent from `FireOptions` and will
stay absent.

- **The missing half of the chain**: `approveAsk(askId, { by })`, `declineAsk(...)`,
  `alwaysApprove(id, { by, instance?, expiresInMs? })`, `revokeAlwaysApprove(...)` —
  each stamping `principal: 'user'` with **no argument to override it**, each requiring
  `by`, each returning a typed `ApprovalResult` instead of throwing (they run in click
  handlers), each answering `NOT_ENFORCED` on a session without the option.
- **One yes, one fire.** An ALLOW is single-use; the spend appends its own `'used'` row
  so an auditor can count approvals against executions, and a replay is `APPROVAL_SPENT`.
- **The approval binds to the receipts.** `confirmAsk(id, { input, instance })` puts what
  will be sent on the card (`ConfirmReceipts.willUse`), and a fire carrying anything else
  is `APPROVAL_MISMATCH`. Exact structural equality, key-order-independent; anything the
  receipts cannot hold faithfully is refused rather than guessed. It binds a **detached
  copy**, so keeping your own reference and changing it after the yes is refused rather
  than compared against itself.
- **ALWAYS ALLOW is a policy row**, scoped to the action (+ optional instance) and
  deliberately not to the input — and revocable, because a durable grant with no off
  switch is a permanent hole.
- **The decline is unforgeable too**: under enforcement `declineConfirm` records a REPORT
  and closes NOTHING *whatever `principal` it is handed* (the row carries `relayed: true`),
  so nobody can manufacture a human no or bury the pending card by asking politely. A
  human's no is `declineAsk(askId, { by })` — terminal for that askId, and it outranks a
  standing grant for the action, instance and input the person was shown whether or not
  the later fire presents the pointer. A re-ask mints a new askId, so nagging is countable.
- **A port that cannot enforce does not say it does.** The gate keys on the principal, so
  `skillsAsTools(session, { source: 'user' })` is exempt by design — it now warns when it
  is built and serves the *unenforced* `confirm`/`decline` descriptions rather than telling
  a model this app refuses what it does not refuse. New: `requiresHumanApprovalFrom(principal)`,
  the honest question for a port.
- **`groundTruth()` is bounded where an agent can mint lines**: the "awaiting the human"
  cards obey the same `maxAttempts` dial as the attempts list (oldest kept, count stated),
  so a model cannot inflate the one block it is told to trust above its own account.
- Every refused crossing lands in **both** ledgers — a `'fire-rejected'` gap row (so
  `groundTruth()` says *"did NOT happen … was refused: APPROVAL_REQUIRED"*) and a
  `'refused'` confirm row. Rows are never deduplicated; only the dev warning is.

**Nothing changes without the option** — pinned by
`test/human-approval-default-unchanged.test.ts`, and checked the only way that claim can be
checked: a 0.6 consumer compiled and run against the published 0.6.0 and against this build, and
the two transcripts diffed. The served tool schema is identical byte for byte, and so is the whole
ask → `confirm: true` → `approved` chain, `whats_here`, transitions, gaps, `groundTruth()` and the
warnings. **One field is not:** confirm-journal rows now take their `timestamp` from the session's
injected `now()` instead of `Date.now()`. A session handed a clock should use it, so this stays —
but if you inject `now` and assert on `confirms()[n].timestamp`, you will see your own clock where
the wall used to be. That is the whole difference.

One further exception was found and closed before
release: the Mode B port had begun passing the model's `input` to `confirmAsk` on every
high-effect ask, so a session with the option OFF would have started carrying user payloads
in `receipts.willUse` and in the exported confirm journal. It is passed only where it binds
something now; call `confirmAsk(id, { input })` yourself if you want the card to show it
either way.

#### Note for anyone switching exhaustively on `FireResult` or `ConfirmRecord.kind`

Both unions widen. `FireResult` gains `APPROVAL_REQUIRED`, `APPROVAL_SPENT`,
`APPROVAL_MISMATCH`, `APPROVAL_STALE` and `APPROVAL_DECLINED` (and
`GapRecord.rejectionReason` the same five); `ConfirmRecord.kind` gains
`'always-approved'`, `'used'`, `'refused'` and `'revoked'`. As always, a new value is a
new fact and never an old one relabelled — read the ones you know and let the rest fall
through. A durable grant is a new KIND rather than a `scope` field on `'approved'`
precisely so an older filter cannot silently miscount it as a one-time yes. The growth
paragraph missing from `FireResult`, `GapRecord.rejectionReason` and `ConfirmRecord.kind`
is now on each type, which the 0.6.0 notes had already promised.

**Triage note:** the five `APPROVAL_*` gap rows are SECURITY rows, not missing capability.
Route them to your audit sink, never to a "what to build next" query.

**Turning it on is a two-part change,** and the second part is yours: the option makes the
gate real, and your app has to give a person a way to answer. Wire your Approve/Decline
controls to `approveAsk` / `declineAsk`. Until you do, every high-effect agent fire is
refused `APPROVAL_REQUIRED` — fail-closed on purpose.

**And the honest limits, in the docs rather than in a footnote.** The gate proves a row of
the right kind, from the right principal, for this action and this input, exists and has
not been spent. It does not prove a particular person authenticated (`by` is your string),
and it cannot verify that your app keeps `approveAsk` out of the model's reach — the option
moves approval onto a channel the model does not write *by a convention you uphold*, not by
a proof the library can offer. It keys on the PRINCIPAL, so a direct
`fire(id, { source: 'agent' })` IS gated while the app-self-report tier (`'user'`,
`'system'`, `invoke: false`) is not: hand a model a port built with `source: 'user'` and
you have disarmed this gate — the library warns and stops claiming the gate, but it cannot
stop you. See [D24](docs/design/d24-enforced-approval.md), whose *Round two*, *Round three*
and *Round four* sections record every forgery an adversarial review landed against this
feature and what each one cost to close.

**The payload the gate proved is the payload that executes.** The last pass found the other
half of the copy the ask binds to. The FIRE's payload was not copied: the gate read it, and
`fire()` returns synchronously while the handler runs on the next microtask — so a plain
`payload.total = 999999` on the following line was enough to have the gate prove `10` and the
handler receive `999999`, with the confirm journal reading ask → approved → used and
`transitions()[0].payload` reading `999999` against a card that said `10`. The gate now reads
your payload **once** and the comparison, the record and the handler all read that one
reading; a payload it cannot copy faithfully is refused `APPROVAL_MISMATCH` /`cannot-judge`,
because it cannot prove what such a value will be when the handler reads it. **The one thing
to know:** in a session with `requireHumanApproval`, a high-effect agent fire hands your
handler a structural copy rather than your object — send plain data in a high-effect payload,
not a `Map` or a class instance. Without the option nothing changes: your handler still
receives your own object, pinned by its own tests.

## [0.6.0] - 2026-07-29

**A production integration's four remaining workarounds are now deletable** — the
number this release is measured by.

1. **The settlement relay** — a transition listener keyed by `transitionId`, a
   four-second ceiling, and a rewrite on the relay's send path, all written because
   `whenSettled` is a promise and a promise cannot cross a tool boundary. The settled
   truth crosses it now: `settlementOf` / `settlementIfKnown` in process,
   `port.whenSettled` for a relay holding only the port, and a `did_it_work` tool for
   the remote agent — with a ceiling at the MCP boundary that decides how long to
   wait and never what the answer is.
2. **The ~60 lines of before/after DOM signature comparison per action** — written
   because a radio fire returned `effectStatus: 'performed'` while nothing got
   selected, and a wizard's Next returned 'performed' while the button it clicked was
   DISABLED. Declare `verify` and the app's own checks outrank a handler that merely
   returned; declare `enabledWhen` and a greyed button is served as greyed.
3. **The three hand-written nav tools attached to all 28 pages** — written because a
   route table contributed pages and ZERO actions, so an agent on a wizard page
   truthfully answered that there was no action that would take you to the Projects
   list, and looped. `fromRoutes(routes, { crossLinks: true })` turns each page into
   the one action a route can honestly describe: **go to this address**.
4. **The `value: ""` sent to click-only controls** — a uniform relay contract's empty
   string that reached the handler and OVERRODE authored defaults. `input: 'none'` at
   the authoring door, `expects: 'none'` on the wire, and a blank payload erased
   rather than obeyed.

Two failures nothing in the field had a workaround for. With nothing to check itself
against, a model narrated an entire flow — *"name set, recipe selected"* — having
called ZERO tools; its own prose had become its context. `groundTruth()` is the block
that outranks the conversation, and a refused attempt (a gap-ledger row, never a
transition) is finally visible in it. And **a room with no doors now names itself**: a
`kind: 'dead-end'` row where an agent fire of every served action would refuse
`NOT_MATERIALIZED`, recorded without anyone having to fire for the trap to exist —
while a closed guard is NOT a missing door.

**Nothing released breaks**, and the two changes that would have broken something were
caught by the final review and made additive instead of shipped.
`SkillToolsPort.whenSettled` is **optional** on the published interface — the first cut
required it, which is a compile error in code that never asked for the feature — and
the factory returns the new `SkillToolsPortWithSettlement`, where it is required, so a
caller holding the factory's port never checks for a door the library always provides.
`GapRecord.kind` gained a fourth value, `'dead-end'`, as a new FACT and never a
relabelled old one: a released consumer's filter (`kind === 'fire-rejected'`,
`rejectionReason !== undefined`) returns exactly the rows it always did. Both promises
are pinned by `test/non-breaking.test.ts`, a type test as much as a runtime one. The
one consumer shape a growing union does cost is an exhaustive `never` check over the
old set, which is why the growth is now a stated contract on the type itself — read the
kinds you know and let the rest fall through. `SkillDef2` remains as a deprecated alias
for `JourneyDef`, so 0.5.0 code keeps compiling. See the two "Note for anyone…"
sections below.

### Added (grounding — the app's own record, and the app's own checks)
- **`session.groundTruth({ sinceVersion?, maxAttempts? })` → `{ node, version, text }`,
  and `facts` on every Mode B `whats_here` result.** The authoritative block: position,
  then every ATTEMPT and how it came to rest, then any decision the human still owes and
  any fire the app has not answered — under a header telling the model it outranks
  anything said in the conversation. Reported by a production integration: with nothing
  to check itself against, the model narrated an entire flow ("name set, recipe
  selected") having called ZERO tools — its own prose had become its context.
  `contextBrief()` could not have prevented it, and the reason is structural rather than
  cosmetic: a REFUSED fire is a gap-ledger row, not a transition, so a narrative built
  from transitions can never show a failed attempt. This merges BOTH ledgers, ordered by
  cursor version (a proof, not a heuristic: a refusal never bumps the version and a
  recorded fire bumps it immediately, so every row at version V sits inside the window
  that ONE transition closed).
  Nothing is rounded up: only a committed fire whose declared effect was observed earns
  "DID happen"; a fire nobody could check says "ran, but the effect was unobservable";
  a refusal, a rollback, a tour no-op and a failed verify all say "did NOT happen"; a
  fire still out says "not yet known". With nothing attempted it states the
  anti-narration line outright — *No actions have been performed in this app this
  session.* — and behind a `sinceVersion` cursor that would be false it says the cursor's
  own truth and counts what it hid instead.
  Deliberately EXCLUDED: state values and payloads (the two-string-class invariant
  extended to history), produced data, available actions and skills (options are
  `whats_here`'s other half — facts are what happened, so the two stay non-overlapping
  and both stay lean), 'reported' gap rows and all runtime free text, and any
  interpretation. An id the graph does not have renders as a constant rather than
  echoing a model's own invention back at it, the discipline `#nodeLabel` already
  applies to off-graph page names.
- **`verify` on a tool/affordance — the app's own answer to "did that actually
  happen?"** Either a `WhereFilter` over projected state (`{ 'wizard.recipe': { ne: '' } }`)
  or a SYNCHRONOUS predicate handed a DETACHED state snapshot, whose closure may read
  whatever the app can (the DOM included). Reported by a production integration: a radio
  fire returned `effectStatus: 'performed'` while nothing got selected, and a wizard's
  next-button returned 'performed' while the button it clicked was DISABLED — the agent
  looped five times, correctly, on the information it was given. Their workaround was
  ~60 lines of before/after DOM signature comparison per action.
  Evaluated AT SETTLEMENT, at exactly the three points a fire comes to rest as a success
  (an attributed state report, a tapless handler completing, a synchronous commit whose
  handler completed). Holds → nothing changes. Fails → the settlement routes through the
  existing failure spine: `effectStatus: 'refused'` (an EXISTING word — none were
  renamed), a structured `{ reason: 'VERIFY_FAILED', explanation, evidence }` on `error`,
  a claims-only commit rolled back with the honest cursor walk-back, and an
  evidence-backed commit STANDING while the settlement still refuses — both truths
  carried, neither averaged.
  `FireSettlement` gains `verifyHeld?: boolean | 'unevaluable'`, a THIRD axis beside
  `effectStatus` (did anyone perform it) and `effectVerified` (did the declared write
  keys appear). Named for the DECLARATION that produced it, never the bare word
  "verified": an axis a reader can attribute to the wrong question is one this library
  treats as unreported. What cannot be checked never refuses: an unknown state key, or a
  predicate that threw (isolated + warned), is `'unevaluable'`. A refusal needs proof —
  one false conjunct proves a conjunction false whatever the unknown keys hold — while a
  confirmation needs everything, because a wrong rejection blocks an action the app would
  have accepted and the caller has no appeal.
- **`enabledWhen` on a tool — declarative disabledness**, distinct from `when`: a failed
  `when` HIDES the control, a false `enabledWhen` SERVES it carrying `enabled: false` (a
  greyed button an agent can see) and refuses execution fires as `TOOL_DISABLED` — the
  existing retriable arm. Declare it from the same expression that renders
  `<button disabled={…}>`. `TOOL_DISABLED` now has FOUR wires reaching one refusal:
  `enabled:` at registration, `handle.setEnabled`, a live store's `LiveAction.enabled`,
  and this. Not composed with ancestor `when`s (it is the control's own state, not its
  position in the tree), and it outranks a per-instance registration — a declaration
  greys every row of a repeats container at once. Keys it cannot evaluate never disable
  anything: the library does not guess a control shut.
- **`input: 'none'` — the action that takes NO input**, accepted at all three authoring
  doors (`skillGraph().affordance`, `buildNavigationGraph`, mount-declared tools), each
  of which read the sentinel BEFORE `detectSchema` and each of which still refuses a
  schema it cannot recognize. Reported by a production integration: a uniform
  `{ value: string, required }` relay contract forced the model to send `value: ""` to
  click-only controls, and that empty string reached the handler and OVERRODE authored
  defaults, selecting nothing.
  It compiles to an additive `Affordance.noInput` FLAG with `schema` left undefined —
  deliberately not a synthetic empty JSON Schema, so MCP's no-params arm and the fire-time
  shape gate stay byte-identical. The model is TOLD (`expects: 'none'`) before it can
  guess; a payload sent anyway is refused `PAYLOAD_INVALID` (an existing arm) carrying the
  shape it sent, so it never reaches the handler; and a BLANK payload (`undefined`, `''`,
  `{}`, an object of undefined-valued keys) is accepted and ERASED — protocol residue is
  not intent. An explicit `null` is not blank: it still answers for its shape. Exactly one
  door: schema-bearing actions are untouched (`''` is a real value there — clearing a
  field) and so are actions that declared no input at all (the library cannot know, so it
  does not guess).
- **`expects` on `available().edges` — parity with the wire.** The contract Mode B has
  always served now rides the in-process surface too, from ONE shared derivation
  (`src/traverse/expects.ts`): zod normalized, plain JSON Schema detached, a
  non-serializable validator named in one authored sentence, `'none'` for an input-less
  action. The field report is a port-direct consumer re-deriving that law by hand, and a
  law duplicated at a consumer is drift by construction. The rendered form is cached by
  schema identity and deep-frozen, because `available()` is hot — every refused fire calls
  it for the gap row's context. `schema` (the LIVE validator) is unchanged beside it: the
  residual asymmetry is stated, not hidden — `available()` serves both, a served result
  carries only `expects`, and a live validator never crosses the wire.

### Fixed
- **One name never answers two questions: the settled truth's three axes are named
  apart.** `did_it_work` served `verified` as the boolean form of `effectVerified` (the
  STATE axis) while `FireSettlement.verified` meant the `verify` contract's verdict (the
  CONTRACT axis) — and the two provably disagreed in one payload: a fire whose declared
  write really landed while the app's own check answered no came back
  `verified: true` beside an error sentence saying verification failed, in the exact
  scenario `verify` was built for. The settlement's field is now `verifyHeld`, the wire's
  boolean form is `writesObserved`, and `verifyHeld` **crosses the wire for the first
  time** — the remote agent `did_it_work` exists for was previously left inferring the
  app's own verdict from error prose. Both names were unpushed, so nothing released
  changes.
- **A self-referential input schema no longer kills `available()`.** The one-place
  `expects` derivation deep-freezes its rendered contract, and its walk had no cycle
  guard — so the ordinary JSON-Schema way to describe a tree (a node whose
  `properties.child` is the node) compiled fine and then threw
  `RangeError: Maximum call stack size exceeded` on the hot path every refused fire uses
  for its gap row. The walk now carries a `WeakSet`; the schema is still frozen all the
  way down, cycle included.
- **The compiler's empty-filter refusal names the field the author actually wrote.**
  One shared check serves `when`, `enabledWhen` and `verify`, and its sentence was
  hard-coded to `when` — so an `enabledWhen: {}` author was told to *"Omit 'when'
  entirely"*, a correction pointing at a field not in their graph. It now names the
  field and what an empty one would cost (never offered / only ever disabled / only ever
  refusing), matching what the fluent builder and the mount door already said.
- **`errorText` renders a refusal the library authored in its own words.** A structured
  `{ reason, explanation }` value — the verify contract's — used to cross a tool result as
  `'[object Object]'`, the one rendering that teaches nothing. The cap still applies: a
  structured reason is not an escape hatch.
- **`updateState` removes a pending from the queue BEFORE settling it**, on all four
  attribution arms rather than two. A settlement now asks the verify contract, and a
  refusal there re-enters the failure spine, which reads that queue to decide whether the
  effect ever landed — a record still sitting in it would be read as one that never
  settled, and the later `splice(indexOf(...))` would find it gone and cut an innocent
  neighbour out at index -1.

### Added (settlement — the final truth now crosses the wire)
- **`session.settlementOf(transitionId)` / `session.settlementIfKnown(transitionId)`.**
  `whenSettled` belongs to the one caller that called `fire()`; a promise cannot
  cross a tool boundary, so a REMOTE agent — and the relay in front of it — held
  a transitionId and had no way to learn how the action came to rest (reported by
  a production integration, whose workaround was a transition listener keyed by
  transitionId, a four-second ceiling, and a rewrite on their relay's send path;
  a consumer using the port directly could not do even that). The session now
  RETAINS every settlement it delivers, so the question can be asked at any time:
  an open fire hands back its own latch (one answer, first settlement wins, never
  rejects), a fire already at rest resolves immediately with a detached copy, and
  a fire the app never reports on stays honestly OPEN — `FireSettlement` excludes
  `'pending'` by construction, so a timed-out answer could only be a guessed
  `'unobservable'`. An unknown id, or a stimulus/sync/structure-swap row, is a
  SYNCHRONOUS throw naming the fires that are live: a promise nobody will ever
  resolve is precisely how a mistyped key becomes a confident lie four seconds
  later. `settlementIfKnown` is the same law without waiting (`undefined` while
  the question is open) — what a synchronous caller needs.
  Inferred-attribution rows retain `effectStatus: 'unobservable'`: effect-signature
  inference guesses WHO acted and the library invoked nothing, so `'performed'`
  would launder the guess. The state axis is untouched (`effectVerified: true` —
  the writes really did land).
- **`<graphId>.did_it_work` — a fifth fixed Mode B tool**, input `{ transitionId }`.
  A POLL, never a wait, so `SkillToolsPort.call` stays synchronous: **settled** →
  `{ settled: true, did, effectStatus, outcome, outcomeNow?, effectVerified,
  writesObserved?, verifyHeld?, toNode?, error?, data? }`; **still open** → `{ settled: false, judgment: 'still-pending',
  did, howToAct }` — an honest answer that also tells the model not to repeat the
  action; **unknown** → `{ ok: false, reason: 'UNKNOWN_TRANSITION', pending: [...],
  awaitingSettlement: [...] }`, the `UpdateResult` vocabulary, refusing a wrong id BY
  NAME instead of soothing it
  with a "still running" it cannot know. All THREE axes cross, each under its own name:
  `writesObserved` is the boolean form of `effectVerified`, ABSENT when the answer is not
  knowable (a model testing truthiness would read the string `'unobservable'` as an
  observed write), and `verifyHeld` carries the app's own contract verdict, absent when no
  contract was declared. Neither is called `verified` — one word for two questions printed
  `verified: true` beside an error sentence saying the app's own check had answered no. A fire
  result whose `effectStatus` is `'pending'` now carries an authored `howToSettle`
  pointer naming that tool (and only then: on a fire already at rest it would buy
  a wasted turn).
- **`SkillToolsPort.whenSettled(transitionId)`** — the port's async door, delegating
  straight to `settlementOf` with its laws intact, for the relay that holds the port
  and nothing else.
- **`mcpServer(session, { settleWithinMs })` (default 250).** The one boundary where
  waiting belongs: a `tools/call` is already an async turn. A call that FIRED
  something now races the settlement against the ceiling instead of folding after
  one macrotask — settle in time and the RESULT carries the final word
  (`effectStatus` rewritten, produced data on `data`, a failure on `error`, the
  now-stale `howToSettle` dropped); miss it and `'pending'` STANDS with `did_it_work`
  named as the next call. The ceiling decides how long to wait, never what the
  answer is. `0` is the SHORTEST ceiling, not an off switch: the timer is a
  macrotask, so a settlement already in hand — or one a handler reports in the same
  microtask turn — still wins the race and is still folded in. There is no way to
  turn the fold off, deliberately: withholding an answer the session is already
  holding would be the only dishonest move available at this boundary.
- **`session.awaitingSettlement()`** → `string[]`, the ids whose settlement question
  is still open, in fire order. It is NOT `pending()` and the difference is why it
  exists: `pending()` names fires awaiting the app's STATE report, which a fire
  declaring no `writes` never joins — it still has a handler running and a settlement
  coming. Every pending fire is awaiting a settlement; not every fire awaiting a
  settlement is pending. Asked "what is still live?", `pending()` alone answered
  "nothing" about an action that was at that moment running — which is what
  `did_it_work`'s refusal was serving, leaving the wire teaching strictly less than
  the in-process throw (which has always named the open latches). The refusal now
  carries both lists, side by side: `pending` keeps `updateState`'s exact meaning, and
  `awaitingSettlement` is the superset the question is actually about. The session's
  own refusal message is single-sourced from this door, so the sentence a caller reads
  and the list a caller can query cannot drift apart.
- **`outcomeNow` on `did_it_work`'s settled arm.** A settlement is a RECEIPT and first
  settlement wins, so the record can move afterwards — `reject()` on a committed
  transition (the server saying no after the app's optimistic report) flips it to
  `'rolled-back'`. The tool's own question is *did the app actually do it*, so serving
  the receipt alone answered "it worked" about something the app had since undone — a
  fact the session was holding right there. The later word now rides ALONGSIDE
  `outcome`, never over it, with the one instruction that resolves it (`howToAct`:
  check `whats_here`). Present only on genuine disagreement: a handler that reported
  real evidence and then failed leaves the record committed by design, so it carries
  no marker.

### Note for anyone implementing `SkillToolsPort` by hand
Nothing to do — and that took a second name. `whenSettled` is **optional** on the published
`SkillToolsPort`, so an object literal that hand-implements it (a test double, a from-scratch
relay facade) keeps compiling exactly as it did in 0.5.0; `skillsAsTools` returns the new
**`SkillToolsPortWithSettlement`**, where the member is required, so a caller holding the
factory's port never checks for a door the library always provides. The first cut of this
feature put the required member on the published interface itself, which is a compile error in
code that never asked for the feature — a strange way to ship a door nobody had yet.

### Added (reachability — a spine of places you can walk between)
- **`fromRoutes(routes, { crossLinks })`.** A route table contributed 28 pages
  and ZERO actions, so an agent on a wizard page truthfully answered "there is
  no action that would take you to the Projects list" — and looped (reported by
  a production integration, whose workaround was three hand-written nav tools
  attached to all 28 pages). `crossLinks` is the opt-in that turns pages into
  the one action a route can honestly describe: **go to this address**. Each
  becomes an ordinary root-level tool — `go-to-<pageId>`, a `url` binding
  carrying the route, `goTo` making the claim (role derives `next`) — offered on
  every page in the effective graph except its own target. Opt-in, because
  inventing 28 tools nobody asked for is the other way to be wrong. `true`
  takes every page whose route is fully literal and **filters** `:param` ones (a
  blanket ask meets the literal-address law); a named subset **refuses** an
  unknown name or a paramful route at the factory, where the author is looking.
  Hand-authored `tools` with the same id win silently (the journeys precedent).
  Nothing downstream changed: the links ride `compileTool`, `gestureHref` and
  `handlerFor` exactly as a hand-written tool does, so `navigate` materialises
  them and without it a fire refuses `NOT_MATERIALIZED` carrying
  `gestureKind: 'url'`.
- **The never-trap invariant now covers the ROOM, not just the frame:
  `kind: 'dead-end'` gap rows.** When the cursor comes to rest on a page where
  an agent fire of every served action would refuse `NOT_MATERIALIZED` — no
  actions at all, or none registered, url-materialisable or instance-wired — the
  session records one row and warns once per page, naming all three fixes
  (register a tool group, pass `navigate`, add `crossLinks`). Nobody has to fire
  for the trap to exist, so nobody has to fire for it to be recorded. It is an
  observation, not a verdict: at most one row per (page, `structureVersion`),
  written from write paths only (a `sync()` page change, a fire()-claimed
  navigation settling, the coalesced structure flush) and never from
  `available()`. Armed only where materialisation is a live question —
  something registered somewhere or a `navigate` in hand, and not a tour — so a
  graph merely being read is never called a trap.

### Note for anyone switching exhaustively on `GapRecord.kind`
`kind` gained a fourth value, `'dead-end'` (0.3.0 added the third, `'unmaterialized-fire'`).
Every shipped value keeps exactly the meaning it had, and a filter for the kinds you know
(`gap.kind === 'fire-rejected'`, `gap.rejectionReason !== undefined`) returns exactly the rows
it always did — a new kind is a new fact, never an old one relabelled. The one consumer shape
this stops compiling is an exhaustive `never` check over the old set, which is why the union's
growth is now stated on the type itself, in the README, in `llms.txt` and on Sessions: read the
kind you know and let the rest fall through as informational.

### Changed (merge order — one sentence, amended in every home)
- The documented merge order gains a clause: "…nothing later in the order may
  remove anything earlier. **Routes may also contribute link tools;
  hand-authored tools win.**"

### Changed (naming — non-breaking)
- **`SkillDef2` is now `JourneyDef`.** A number-suffixed name has no business in
  a public surface; the digit only ever existed because `SkillDef` (the v1 flat
  builder's shape, `description`/`steps`/`precondition`) had taken the obvious
  one. The two types were never the same thing: `JourneyDef` is the AUTHORED
  navigation-graph vocabulary (`does`/`steps`/`when`, steps by qualified path
  or unambiguous suffix), and it COMPILES INTO the other — `does` becomes the
  skill's description, `when` its precondition. That is this library's dual
  identity (the consumer authors navigation, the agent reads skills), so the
  authored side is now named for the person writing it: a journey is the path
  someone takes through the app, and `fromJourneys()` already spoke that word.
  `SkillDef2` remains as a deprecated type alias — 0.5.0 code keeps compiling.

### Fixed
- **Mode B's `do_action` no longer answers `UNKNOWN_ACTION` about an action the
  app plainly has.** The name is resolved against the SERVED edges, so a
  guard-closed step or a control on the next page matched nothing and came back
  as *unknown* — a contradiction to a model that read that action's own name out
  of a result one turn earlier, leaving it to report the control missing or reach
  again. The typed `reason` is untouched (0.4/0.5 consumers branch on it); what
  the refusal gained is the truth the session already held. `why` names which of
  three true things is the case — the app has it on another page, it belongs here
  but its conditions are not met, or it is declared here and not being offered —
  and the conditions arm carries `evidence` (plus `guardUnevaluated`), the same
  per-condition detail a `GUARD_FAILED` fire does. `explain()` is the door it
  answers through, so no vocabulary was invented. A name the graph really does not
  have gets no `why` at all, and an ambiguous SHORT name is still answered by the
  id list: the library does not explain something it never saw, and it does not
  resolve a guess on the caller's behalf.
  The BOUNDARY is now stated where a reader looks (Ground truth, "An attempt is a
  fire the session was asked to make"): this refusal is the port's own, no
  `fire()` runs, so it lands no gap row and no `facts` line. The ledgers hold what
  the session was asked to DO.
- **`fire(affordanceId)` no longer crashes.** A JS caller who omitted the
  options object hit a raw `TypeError` reading `opts.source` (found by a
  production integration). `opts` is now optional at RUNTIME and still required
  in TypeScript, so typed callers must keep naming the principal. An omitted
  source reads as **`'agent'`** — the assumption `commitSkill()`, `confirmAsk()`
  and `skillsAsTools()` already publish — and never as `'user'`: an
  unattributed machine action must not enter the gap ledger or the commit log
  as a human one, and defaulting to `'user'` would silently disarm the
  never-trap gate (which refuses only agent fires that could execute nothing).
  An options object built at runtime WITHOUT a `source` follows the same rule.
- `createSession()` with no options (the v1 flat graph) now refuses in this
  library's voice — `unknown starting node 'undefined'. Known pages: …` —
  instead of a `TypeError`. No default is invented: a flat graph's starting
  page is a real decision, so only the refusal's voice changed.

### Documentation (the field's questions, answered where a reader looks)
- **Two new pages.** [Ground truth](docs-next/content/docs/serve/grounding.mdx) —
  the facts block's anatomy, the grading table, what it excludes and why, how to
  inject it per turn, and the rule the field failure came down to: *never feed
  the model its own prose as history*. [Guarded journeys](docs-next/content/docs/build/guarded-journeys.mdx)
  — the wizard pattern as ONE reference implementation: guarded steps,
  `enabledWhen` greying Next, `verify` proving each step, `crossLinks` as the
  always-reachable spine, `groundTruth` read each turn. Both wired into the
  sidebar (`build` after *skills*, `serve` after *receipts*).
- **A runnable example the page is written from** — `examples/guarded-wizard`
  (`npm run example:wizard`), following the demos convention: the transcript in
  the docs is that run's output, pasted, never hand-authored. Its own suite
  proves every claim the page makes, including the control case (the same wizard
  without the spine records a dead-end row and names the three fixes).
- **Cross-links** get their own section on Graph sources: the two option shapes
  (`true` filters, a named subset refuses), the literal-address law, the merge
  **phase 2.5** fold and why the source carries the REQUEST rather than finished
  tools, and hand-authored-tools-win. The amended merge-order sentence now reads
  identically in all seven live homes that quote it.
- **The dead-end gap kind** is documented on Live bindings (the
  once-per-(node, served-structure) dedup, the warning's three named fixes, why
  a guard-closed action and an off-graph cursor are different animals), with a
  paragraph on the adoption ladder: *a page where nothing can act now says so*.
- **`verify`** is written up as "proving the click did something" — both forms,
  the exact three settlement evaluation points, and the refusal's own teaching
  sentence — beside a new **`effectStatus` × `effectVerified` pairing table**
  stating outright that no word changed meaning. `enabledWhen` gets a
  hidden-vs-greyed table on Guards, with the four disabledness wires that reach
  one `TOOL_DISABLED`.
- **The `whenSettled` wire limitation** is now stated where it bites (a promise
  cannot cross a wire) together with the four doors that answer it —
  `settlementOf` / `settlementIfKnown` / `port.whenSettled` / the `did_it_work`
  tool — plus what `mcpServer`'s `settleWithinMs` fold **rewrites at the wire**,
  field by field.
- **`input: 'none'`** gets the three-statement table on The navigation graph
  (schema / `'none'` / omitted), the blank-is-not-a-value rule and its exact
  single door, the `PAYLOAD_INVALID` teaching text, and the note that a plain
  JSON Schema is now enforced. **One `expects` law, every surface** documents the
  four renderings and states the residual `schema`/`expects` asymmetry rather
  than smoothing it over.
- **A content drift gate** (`test/docs/content-drift.test.ts`): the merge-order
  sentence must be identical in all seven homes, a quoted refusal must be the
  string the library actually emits, and every page must be in its sidebar.
  Design records under `docs/design/` are deliberately NOT gated — they are
  dated records of what a numbered design decided, not living docs.
- The demos page notes Vite's `node_modules/.vite` dep cache: after rebuilding
  the library at the repo root, clear it (or `--force`) or the dev server keeps
  serving the previous build.
- **The README's test-count badge is now checked by the suite it counts**
  (`scripts/check-test-badge.mjs`, run by npm's `posttest` hook). It had read 324
  while the suite ran 806, and two commits edited the README around it without
  noticing — a number nobody can check is a claim like any other, which is the
  one thing this library says you may not ship. `npm test` writes the run's tally
  (vitest's json reporter → `.test-tally.json`, gitignored) and the gate reads it
  back, comparing BOTH spellings (the badge URL and its alt text — the alt text is
  the version a screen reader is told). It speaks only for a whole run: fewer
  files ran than exist on disk and it says *skipped*, out loud, rather than
  failing a focused `vitest run one.test.ts`.

## [0.5.0] - 2026-07-29

**A real-world FE integration's ~350 lines of integration glue rewrites to 26 lines
on this API** — the number this release is measured by.

The graph now GROWS from what the app already has. An app owns descriptions of
itself — a route table, a set of journeys — and until now each had to be
re-typed by hand into the definition, where the copy drifts the moment either
side edits. `buildNavigationGraph` accepts growable **sources**, and the graph
reads the owner's truth instead of copying it.

One behavior change to read before upgrading: **`commitSkill()` can now refuse
`ENTRY_NOT_MATERIALIZED`** where 0.4.0 opened a skill frame whose first step could
not act. See "Changed" below for the upgrade note.

### Added (static graph sources)
- `fromRoutes(table)` — the app's route table becomes the page SPINE. Page
  names are explicit (the table's keys — this library does not guess a name
  from `/orders/:id`); a route contributes a page, never an action. Seeded
  pages are found again by `matchRoute` for the URLs their routes describe,
  because both sides share one segment law.
- `fromJourneys(journeys)` — the app's journeys become skills, in SkillDef2's
  own vocabulary (`does`/`steps`/`when`). A journey's meaning is judged by the
  compiler's existing skills pass: unknown or ambiguous steps die in the
  builder's existing voice.
- `sources` on `NavigationGraphDef`, folded in BEFORE the compiler's walk
  under ONE documented merge order: **"Pages first (routes then hand-authored,
  hand-authored wins), journeys overlay second and may only add, live actions
  attach last and only bind — nothing later in the order may remove anything
  earlier."** Hand-authored wins per page id with one courtesy — a
  hand page missing `route` inherits the source's route; the same page
  declaring two DIFFERENT routes is refused loudly (drift made visible), with
  route equality judged by the matcher's own segment reading, never string
  bytes. A hand-authored skill wins over a same-id journey silently
  (deterministic and documented). Two sources of the same kind colliding on an
  id are refused loudly — ambiguous authorship.
- Typed node paths now include routes-source pages: `registerToolGroup('home')`
  compiles when `home` came from `fromRoutes`, and a typo is still a compile
  error.
- `pages` is now OPTIONAL on `NavigationGraphDef` — a sources-only def (the
  headline use case) no longer needs a `pages: {}` incantation to satisfy the
  type. Nothing runtime changed: the build-time refusal always judged the
  EFFECTIVE graph, so a def with neither pages nor sources still dies loudly
  with "has no pages", and the typed-path guardrail still holds for
  sources-only defs (the routes-source pages are the typed paths; a typo is
  still a compile error).

Non-breaking by construction: a def without `sources` takes the identity path
and compiles bit-for-bit as before; `fromRoutes`/`fromJourneys` are leaf
modules, so importing one never drags session machinery into a bundle.

### Added (typed actuation on the edge)
- The `Binding` union gains its two missing gestures — the full set now covers
  what a routed web app actually performs: **url | click (element) | tab |
  programmatic**. `{ kind: 'url', href }` is a literal address the app's own
  router can be handed; `{ kind: 'tab', target }` is a tab switch to a sibling
  node path — its own gesture, descriptive in v1 (materialises only via a
  registered handler, NEVER moves the page cursor, and `fire()` never writes
  the PresenceIndex: the app reports the flip through the existing
  `show()`/`setVisible()` wire).
- A paramful url href (`/orders/:id`) is refused loudly at ALL THREE authoring
  doors (the compiler, mount-declared tools, and the fluent
  `skillGraph().affordance()`): a `:param` segment can never materialise,
  because this library does not guess params. Judged by the matcher's own
  segment law, so authoring, routing and materialisation can never disagree.
- `SessionOptions.navigate` — hand the session your router's OWN navigation
  (`(href) => router.push(href)`); presence of the option is the opt-in. An
  edge whose gesture yields a literal href — an explicit url binding, else the
  fully-literal route of the page named by `goTo`/`navigatesTo` — now
  materialises through it: no more fake do-nothing handlers registered purely
  to get navigations past NOT_MATERIALIZED. Registered handlers still win; the
  synthesized navigation rides the same invocation machinery (resolve →
  `effectStatus: 'performed'`; throw → `'refused'` with the honest rollback
  and cursor walk-back); `toNode` stays a claim until `sync()` confirms.
  `available()`'s `materialized` stamp mirrors the same widened question.
- The words got honest too: a NOT_MATERIALIZED refusal now carries the
  declared `gesture` ("this is a click on the checkout button", not "nothing
  is bound"), and gap-ledger rows for `fire-rejected`/`unmaterialized-fire`
  carry `gestureKind` — the demand backlog says WHICH wiring is missing (a
  click handler vs a navigate fn), token-lean.

### Added (live graph source)
- `fromLiveStore(store)` — the third source: the app's live action store
  (subscribe + read-current, the shape React itself blesses) drives the
  existing declare-then-bind wire per session. Reconciled by identity key
  `node.name`(+instance): new registers, gone releases, an `enabled` flip
  flows to TOOL_DISABLED, and an UNCHANGED action is never re-registered — a
  chatty store causes zero warnings and zero phantom structure bumps. An
  action for an already-declared tool BINDS silently (attach last, only bind);
  a genuinely new one mount-declares. Zero value imports — a static-graph
  consumer never bundles it (proven by the new tree-shake test).
- `InteractionSession.detachSources()` (idempotent) releases everything the
  graph's live sources attached; the direct door
  `fromLiveStore(store).attach(session)` returns its own detach.

### Changed (behavior change, pre-1.0 minor — the never-trap invariant)
- **`commitSkill()` gains one typed refusal, after its existing four:
  `ENTRY_NOT_MATERIALIZED`.** An AGENT commit (the default source) outside a
  tour session is refused when the skill's ENTRY step could not act AT ALL
  right now — no registered handler under any key (instance-keyed wiring on a
  repeats container counts: the fire that follows carries the instance) and no
  navigate-derived gesture — the frame that could never act is never opened,
  so a planner is never invited into a narrowed room where the first promised
  thing does nothing. Same treatment 0.3.0 gave NOT_MATERIALIZED:
  fail-closed, typed, and one gap row (`rejectionReason:
  'ENTRY_NOT_MATERIALIZED'` with the entry step, the new `skillId`, and
  `gestureKind`) — no transition, no commit bundle, because nothing touched
  state. **Upgrade note:** if your agent flow commits skills before the app's
  handlers mount, either register the entry step's handler first (the same
  wiring 0.3.0 asked of fires), pass the new `navigate` option when the entry
  is a pure navigation, commit with `source: 'user'` for human-driven flows,
  or create the session with `allowUnmaterializedFires` for touring. User
  commits, tours, registered-but-disabled entries (retriable), and every
  already-wired flow behave exactly as before.

### Fixed (review fix-back, before release)
- **The commit gate no longer falsely refuses an instance-wired entry.** As
  first written the gate asked `handlerFor` with no instance, so a skill whose
  entry is a repeats-container tool wired ONLY per card
  (`'cancel-order[o-123]'`) was refused `ENTRY_NOT_MATERIALIZED` while the
  very same entry fired `ok: true` with the instance key — an uncommittable
  but fully agent-drivable skill, with a refusal reason that was factually
  false. The gate's question is now `couldMaterialise` — "could the entry act
  AT ALL right now, for any caller" — which counts instance-keyed wiring; an
  entry with no wiring under ANY key is still refused, and a sibling tool's
  instance keys never open a different entry's gate.
- **The fluent door joins the url build gate.** `skillGraph().affordance()`
  accepted a paramful url binding the other two authoring doors refuse
  loudly, silently authoring a permanently-dead edge (runtime honesty held —
  agent fires answered NOT_MATERIALIZED — but the promised build error never
  came). Same `checkLiteralHref` law, same words, third door.
- **`fromLiveStore` reconcile failures no longer break the app's own store.**
  A bad action arriving in a LATER store emission threw out of our subscribe
  callback INTO the app's notify loop, aborting its iteration over its other
  subscribers. Post-attach reconciles are now isolated (recorder rule): a
  failure warns through the session's own `onWarn` sink (console for the
  direct `attach` door) and leaves bindings as-is until the store's next
  emission, which simply retries. The FIRST read at attach stays LOUD — an
  invalid action is an authoring error and dies at `createSession` — but the
  loud throw now cleans up after itself: the subscription is released and any
  bindings registered before the bad action are unregistered, so a failed
  attach leaks nothing. (`LiveSource.attach` gains an optional second `warn`
  parameter; one-parameter implementations still satisfy the shape.)

### Added (the docs site)
- A documentation site at `https://footprintjs.github.io/hcifootprint/docs/` —
  a nested Fumadocs app (`docs-next/`) assembled UNDER the storydeck home into
  the one Pages artifact (the home's bytes are untouched; the deploy only ADDS
  `docs/`). Guides cover the graph, sources + the merge order, actuation and
  the never-trap invariant, guards, skills, presence, live bindings, serving
  (Mode B, MCP, receipts), the 0.4.0 fire() honesty wave
  (`effectStatus`/`whenSettled`/input contracts), the tree-shaking story with
  the pinned probe numbers, and the demos.
- Anti-drift, wired as gates rather than promised: the API reference is
  GENERATED from all four public entry points (`.`, `./mcp`, `./testing`,
  `./testing/lint`) on every build and freshness-checked in CI
  (`check:api` — regen + `git diff --exit-code`); guide snippets are
  twoslash-compiled against the built library types; every internal link and
  the README's absolute site links are checked by
  `scripts/check-doc-links.mjs --strict` in CI AND inside `npm test`
  (`test/docs/`). `/llms.txt`, `/llms-full.txt` and per-page `/llms.mdx/*`
  are generated from the same corpus, so they can't drift. `docs/design/d23-graph-sources.md`
  joins the design lineage.

## [0.4.0] - 2026-07-29

`fire()` now tells you what actually happened. Three workarounds a real-world FE integration
had to write against 0.3.0 are deletable in this release:

1. **The settlement timing guess** — the `setTimeout`/poll wrapper that existed because
   `fire()` returned `settlement: 'settled'` before the deferred handler had run. Read
   `effectStatus` for what is known at return time, and `await whenSettled` for the rest.
2. **The throw-adapter** — the wrapper that re-threw a handler's returned `{ok: false, error}`
   so the library would stop recording a failure as a successful transition. A returned
   failure is now a failure.
3. **The payload guessing** — the hand-maintained copy of each action's input shape, kept
   because a `do_action` caller could only learn the contract by guessing wrong once, and
   because a declared plain JSON Schema was never enforced. Every served action row now
   carries `expects`, and a wrong payload is refused with a message that teaches the shape.

### Changed (behavior change, pre-1.0 minor)
- **A handler that reports failure by RETURNING `{ok: false}` now takes the throw's path.**
  Previously it was recorded as a SUCCESSFUL transition carrying its own failure object as
  planner-visible `produced` data. The outcome now flips to rejected/rolled-back, a claimed
  navigation walks home, and the failure becomes the settlement's reason. The test is narrow
  on purpose (own property, strict `=== false`), so a `fetch` Response — whose `ok` is a
  prototype getter — stays data, as do `{ok: true}` and error-only objects. Warnings read
  `"returned failure:"` vs `"threw:"` so a log can tell a protocol refusal from an exception.
- **A plain JSON Schema is now enforced at fire time** (`checkPayloadShape`, default `true`).
  Before, only zod-style `.safeParse`/`.parse` validators ever ran, so an action declaring
  `{value: string}` accepted `{name: 'add milk'}` and the handler destructured `undefined`.
  This is the promise Mode B already published — "a wrong input returns a structured error
  RESULT carrying what was expected" — which a plain JSON Schema could not keep while nothing
  enforced it. The checker is teachable, not complete: required keys, declared primitive
  types, closed objects, one level of nesting. `$ref`/`allOf`/`anyOf`/`oneOf`/`enum`/`format`/
  `pattern` it declines to judge and passes, the stance `guardUnevaluated` already takes on an
  unevaluable key — a wrong REJECTION blocks an action the app would have accepted, and the
  caller has no appeal. The gate is SOURCE-BLIND on purpose: a record-only `invoke: false`
  sensor fire and the app's own `'user'`/`'system'` fires answer for the payload too (that is
  where zod already sat in 0.3.0). `checkPayloadShape: false` restores the 0.3.0 pass-through
  byte for byte.
- **Upgrade note.** `PAYLOAD_INVALID` `'fire-rejected'` gap rows are now REACHABLE for plain
  JSON Schema — same `GapRecord` shape, more rows. Transition records, the commit log and
  `SessionEvents` are byte-identical, and `fire()` is still synchronous with every existing
  field meaning what it did.

### Added (fire() says what it knows, and hands over a promise for what it does not)
- `FireResult.effectStatus` — the INVOCATION axis, read at return time. Structurally never
  `'performed'` there (the handler is always deferred): `'pending'` when something will run,
  `'unobservable'` when nothing is bound. Deliberately separate from `effectVerified` (the
  STATE axis) — a tapless handler completes `'performed'` with `effectVerified`
  `'unobservable'`, and a handler can fail AFTER its real state report landed. Both truths are
  carried; neither is averaged.
- `FireResult.whenSettled` — resolves ONCE with the final truth (`FireSettlement`: status,
  outcome, a transition snapshot, error/produced) and NEVER rejects, because fire-and-forget is
  the dominant call pattern and an orphaned rejecting promise would be noise no 0.3.0 consumer
  opted into. A fire the app never reports on stays unresolved — the honest mirror of
  `pending()`.
- Mode B `do_action` results carry `effectStatus` too: the word crosses the wire, the promise
  deliberately does not.

### Added (the input contract, advertised before the fire)
- Every served action row now carries `expects` — the declared input contract, visible BEFORE
  the fire, for JSON Schema, zod and non-serializable validators alike. It already rode skill
  `readySteps` and rejections; a `do_action` caller could previously only learn the shape by
  guessing wrong once.
- The refusal teaches: `missing required 'value' — expected { value: string }, received
  { name: string }`. The rejection and the advertisement render the SAME shape string, so a
  planner correcting from either lands in the same place. Every message is built from key names
  and type names only — a payload value never enters a string bound for the model or the gap
  ledger. Key names are capped at 40 characters, so a caller-chosen 100,000-character key can
  no longer inflate `issues` on its way to the model.

### Added (the small edges — a plan you can ask about, a route read back)
- `session.trySkillPlan(id)` answers with a value where `skillPlan(id)` throws. The asymmetry
  was ours: `commitSkill()` already returned `{ok: false, reason: 'UNKNOWN_SKILL', known}` for
  the very same question, so a caller holding a model-supplied id handled it two ways — and the
  throw is the one that reaches production unhandled. `skillPlan()` keeps throwing on purpose:
  every in-library caller passes an id the spec just yielded, where an unknown one is a bug that
  should stop the program. Membership uses `Object.hasOwn`, because `skills['constructor']` is
  truthy on a plain object.
- `matchRoute(pages, path)` reads the `route` every page has always declared and nothing ever
  read back — an app whose router speaks `/orders/123` used to write that mapping a second time,
  by hand, beside a declaration that already said it. `sync()` is deliberately NOT wired to it;
  the caller composes `sync(matchRoute(graph.spec.pages, path) ?? path)`, so a path this cannot
  place stays unplaced and lands on the existing off-graph behavior. Literal segments and
  `:param` only; a syntax it does not implement MISSES rather than guessing.

### Fixed
- **A schema that allows keys by pattern is not a closed one.** `patternProperties` beside
  `additionalProperties: false` no longer causes a wrong refusal — the author's full schema
  ACCEPTS `{'x-trace': 'abc'}` where they wrote `patternProperties: {'^x-': …}`, and the checker
  read the closed rule as "only the keys in `properties`". Only THAT rule stands down: required
  keys and declared types keep being judged beside `patternProperties`.
- The `contextBrief()` empty-key line said `(nothing)`, which reads like a report the library
  lost and sends a reader hunting a bug that is not there. It now says what actually happened:
  same-value writes and undefined-valued keys net out before the commit. It deliberately names
  no dial — `commitValues` looks like the culprit and is not.
- Docs corrected where `src/traverse/README.md` and the payload-shape module header claimed
  `issues` reaches the gap ledger. It does not: `recordRejection` stores the rejection REASON
  alone. `issues` rides `FireResult` and the Mode B rejection a model reads.
- `NOT_MATERIALIZED` is pinned as KIND-AGNOSTIC. The 0.3.0 report arrived as a `goTo` tool and
  the gate can be misread as being about navigation; it is about actuation. A write-only click
  nothing is bound to is the same lie told without moving. Tests only.

Reported by a real-world FE integration.

## [0.3.0] - 2026-07-25

### Changed (D22 — an agent fire that would execute nothing is refused)
- **Behavior change (pre-1.0 minor).** An agent-sourced `fire()` of a declared-but-UNBOUND tool now
  returns the typed rejection `NOT_MATERIALIZED` instead of a success-shaped no-op (and, for a
  `goTo` tool, silently moving the cursor). Reported from a live agent: in guide mode the model was
  told `{ ok: true, settlement: 'settled' }`, reported "successfully created the project…", and the
  real app had never moved. The library now enforces its own README rule, fail-closed — the
  `guardUnevaluated` stance applied to actuation: never launder a claim as a fact.
  The app self-report tier is untouched: `source: 'user' | 'system'` and the record-only
  `invoke: false` sensor still pass (that motion really happened), and a mid-mount node still
  answers the retriable `STILL_MOUNTING`. Every port inherits the gate from the one chokepoint
  (Mode B `skillsAsTools`, the MCP server, direct `fire()`, `hcifootprint/testing`).
- **Upgrade note.** Three public unions widen, so an exhaustive `switch` gains a case and stops
  compiling until you add it: `FireResult` rejection reasons gain `'NOT_MATERIALIZED'`, and
  `GapRecord.kind` / `GapRecord.rejectionReason` gain `'unmaterialized-fire'` / `'NOT_MATERIALIZED'`.
  Gap-stream volume changes too: `gaps()` and `onGap` now carry a row for every unbound agent fire
  that previously returned success-shaped and left no trace.

### Added (D22)
- `allowUnmaterializedFires` session option (`createSession`) — honest touring for guide/tour/plan
  flows: the no-op fire proceeds and says so. The result carries `executed: false` +
  `materialized: false`, the transition is stamped `materialized: false`, `contextBrief()` renders
  `not materialized — nothing executed`, every served edge (and Mode B `readySteps` / `whats_here`
  action) is stamped `materialized: false` before it is fired, and each no-op lands a gap-ledger row
  of the new `kind: 'unmaterialized-fire'` — the binding still to build, clustered with the rest of
  the demand backlog.
- `toNodeClaimed: true` is now disclosed on Mode B fire results whenever the cursor moved on an
  edge's declared `goTo`. The flag existed internally (on the transition, and in the context brief)
  but never rode the result, so a claimed navigation could diverge from the real app silently. Docs
  gain the consumer rule: **re-`sync()` after any claimed navigation** (a bound handler completing
  does not confirm navigation either — only `sync()` does).
- `TransitionRecord.materialized`, `FireResult.executed` / `FireResult.materialized`, the
  `NOT_MATERIALIZED` rejection reason (also on `GapRecord.rejectionReason`), and the
  `'unmaterialized-fire'` gap kind. See `docs/design/d22-materialized-fires.md`.

### Added (D21 — receipts on the high-effect ask, and decisions that leave a record)
- The `needs-confirm` result now carries `receipts` (`ConfirmReceipts`) — `willDo` (edge
  description + declared, honesty-tagged effect), `because` (the guard evidence that made the
  edge fireable — KNOWN, not scored), `youAreOn`/`version`, and `recentSteps` (the fire-journal
  tail) — assembled from what the session already knows, so an agent can SHOW the human what
  they are approving. Rides `doStep`/`doAction`/MCP as plain JSON.
- A confirm journal: `session.confirmAsk(id)`, `session.declineConfirm(id, {by?, note?})`,
  `session.confirms()`, `session.onConfirm(fn)`, and the `'confirm'` observer event — the
  auditable ask → decision → fire chain. A confirmed `fire()` auto-closes its ask as `approved`
  and stamps `TransitionRecord.askId`. Kept SEPARATE from the gap ledger (a gated action is
  consented capability, not unmet demand).
- Mode B: a `decline: true` arg on the skill-tool / `do_action` call records the human's refusal
  (returns `judgment: 'declined'`) instead of the ask dangling — symmetric with `confirm: true`,
  added to the static input schema (a one-time pre-1.0 schema bump).
- Field kinship with agentfootprint's `checkIn` evidence is deliberate (one mental model across
  both libraries); nothing is imported across — the one substantive divergence is `because`
  (KNOWN guard evidence) vs `drivers` (a scored guess). See `docs/design/d21-confirm-receipts.md`.

## [0.2.0] — 2026-07-19

First npm release (previously git-install only).

### Added
- `requiredStateKeys()` on both graph types (`SkillGraph` and `NavigationGraph`) — the
  sorted set of state keys every guard reads, so a projector can be seeded completely
  (an unseeded key is served with the `guardUnevaluated` honesty marker, not hidden).
- `whats_here { sinceVersion }` — Mode B replies can narrate only the delta since the
  model's last look; a fixed `why` tool serves the causal backward slice for a state key.
- `llms.txt` — a single, source-verified API page for agent (and human) consumers.
- README: guard-semantics section, the adoption ladder (guide mode blessed as Phase 0),
  and the Mode B settlement re-read rule.

### Fixed
- Git installs now build themselves (`prepare` script) — `npm i github:footprintjs/hcifootprint`
  ships a working `dist/`.
- `undefined` is never stored: a report entry whose value is `undefined` is dropped, and a
  declared write reported as `undefined` counts as missing; a key holding `undefined` is as
  unevaluable as an absent one.
- Subpath exports (`/mcp`, `/testing`, `/testing/lint`) resolve under node10 typing
  (`typesVersions`); attw + publint clean.
