# Conditional destinations — DESIGN, not built

Status: **DESIGN. Nothing here is implemented.** Written after layers 1–3 (the derivations) shipped
green, because this one crosses a line they did not and should be attacked before it is built.

## Why this one gets a design round when the others did not

Layers 1–3 (`whatUnblocks`, `inFlight`, `howToReach`) were **derivations**: additive, no change to what
an app declares, no existing law touched. If a derivation is wrong it is wrong in a read, and the fix
is local.

This changes **what an app declares** (`goTo` grows a second form) and **an existing law** (arrival
corroborates against one target; it would corroborate against a set). That is the same shape of change
`humanDecides` got a design round for, and it earns one for the same reason.

## The hole

A real flow: *press Continue — you land on Review, or on Fix-errors, depending on whether the form
validates.* Today `goTo` is one page id, so an app must declare one of the two and be silently wrong
half the time — or declare neither, and tell the model nothing.

Field evidence: a production integration's own wizard config already expresses this, and has for a
while:

```ts
edges: [
  { to: 'evaluation', when: { truthy: 'data.trainingJobStarted' }, priority: 10 },
  { to: 'configure' },                       // unconditioned = the fallback
]
```

Their engine resolves it with a rule worth copying rather than inventing: **eligible edges sort by
priority, highest wins, the unconditioned edge is the default.** Deterministic, inspectable, no
scoring.

## What is NOT proposed (settled in `context-engine-api.md` D3/D3b)

- **A navigation helper the library owns.** Refused — it would make an app's routing depend on us.
  Handing us *their* `navigate` (which already ships) is the opposite and is fine.
- **The library evaluating a condition to NAVIGATE.** Refused. Our state view can lag what the real
  branch tests, and we would send a user to the wrong page — an error we *caused*.
- **Requiring this at all.** The router→sync bridge already handles conditional navigation today with
  zero declaration: the app branches, navigates, and `sync()` reports where it landed. This is
  optional forward-looking sugar, and the docs must teach the bridge first.

## The proposed shape

```ts
// today — still valid, unchanged
goTo: 'order-review'

// proposed — a set the app picks from
goTo: [
  { to: 'fix-errors',   when: { formValid: { eq: false } }, priority: 10 },
  { to: 'order-review' },                                  // unconditioned fallback
]
```

Served on the row as candidates, with the library's reading marked as a reading:

```json
"goesTo": {
  "mayReach": ["fix-errors", "order-review"],
  "reading": "fix-errors"
}
```

## The laws it must obey (each becomes a test)

1. **Evaluated to DESCRIBE, never to ACT.** The app still navigates. If the reading is wrong, `sync()`
   corrects the cursor and nothing was caused. This is the same posture `enabledWhen` already has.
2. **Unevaluable is said out loud.** A condition over keys the session was never told about is
   disclosed with the candidates and **no** reading — the `guardUnevaluated` arm, not a guess.
3. **Priority is the resolution law**, copied from the field: highest eligible wins, unconditioned is
   the fallback. No scoring, no "most likely".
4. **Arrival corroborates against the SET.** Landing on any declared candidate marks `observed`.
   This is the one real payoff: today, declaring one target and legitimately going elsewhere leaves
   `arrival` at `claimed` forever, which reads as *never corroborated* when the truth is *went to the
   other valid place*.
5. **Landing outside the set is not a failure verdict.** It means the declared set was incomplete.
   Contradiction is never verdicted — the wave-3 law, unchanged.
6. **A single-string `goTo` keeps working, byte-identical.** Purely additive.

## Open questions for the review

1. **Does `reading` belong on the wire at all?** It is honest (marked as a reading, corrected by
   sync) but it is the library's opinion about app state, and this library has been right to be
   stingy with opinions. The safer version serves `mayReach` only and lets the model ask.
2. **Does `howToReach` walk conditional edges?** If a hop *may* lead somewhere, is it a route? Leaning
   yes-with-the-set-disclosed, but a route built from maybes is a weaker claim than a route built from
   single targets, and the difference should be visible.
3. **Does this actually receive a real wizard config without loss?** Testable — we have one. That test
   should be written *before* the implementation.
4. **Intra-page steps** (`route: null`) are the other half of a lossless translation, and are a
   separate, larger change (the field's own engine needed a `collapseTrailingIntraSteps` pass for back
   navigation). Kept out of this design deliberately.
