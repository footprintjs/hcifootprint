---
title: AttributionBasis
---

# Type Alias: AttributionBasis

> **AttributionBasis** = `"caller-asserted"` \| `"named-by-report"` \| `"handler-window"` \| `"direct-call"` \| `"declared-stimulus"` \| `"external-report"` \| `"sensed-click"` \| `"signature-match"` \| `"queue-order"` \| `"unknown"`

Defined in: [src/atom/types.ts:123](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L123)

WHICH RUNG FILED THIS MOTION under the principal it names. A closed set, one
word per way this library can come to associate a transition with an actor —
and the reason the set is closed is that three of the ten are guesses and a
reader has to be able to tell which.

The certainty each one is worth is a TABLE, not a judgement call:
`CERTAINTY_OF` in traverse/attribution.ts, total over this union.

- `'caller-asserted'`   — a fire came through `fire()` and named its
  principal (or a principal-bound port did). This library watched the call;
  who was behind it is the caller's word.
- `'named-by-report'`   — `updateState({ transitionId })`: the app's own
  report named the fire it is about.
- `'handler-window'`    — the report arrived from inside that fire's own
  handler call. Nothing was matched, so nothing could be mismatched.
- `'direct-call'`       — the app called its own wrapped (`contextful`)
  function; the library was in the call.
- `'declared-stimulus'` — the caller said the world moved (`stimulus` and/or
  `principal` on the report).
- `'external-report'`   — `observeEffect(transitionId, …)`: the app handed in
  a report from a source THIS CLIENT CANNOT SEE and named the fire it closes.
  The ASSOCIATION is observed (the id was given, nothing was matched); what
  the report SAYS is a claim nobody here watched, and no word in this union
  grades that — [TransitionRecord.observations](/api/index/interfaces/TransitionRecord#observations) names who said it.
- `'sensed-click'`      — an anchor observed a trusted click. Evidence a
  person acted; WHICH action is inferred (see [Cause.inferred](/api/index/interfaces/Cause#inferred)).
- `'signature-match'`   — the delta matched exactly one action's declared
  writes. A shape, never an identity.
- `'queue-order'`       — the oldest pending fire, in arrival order. Order is
  not evidence.
- `'unknown'`           — nobody named anything and nothing matched. The row
  exists because state never moves silently.
