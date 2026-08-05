# D21 — Contextful actions: the anchor becomes bidirectional

**Status: BUILT 2026-08-05, as papered.** Shipped as `contextful(fn, opts?)` +
`contextful.sense(anchor, opts?)` on the root entry, `session.sense()` /
`session.sensedTrail()`, and `TransitionRecord.captured`. Suite 2303/2303 green,
100% coverage, typecheck clean, zero breaking changes. The body below is left as
the spec wrote it — it is the record of what was decided and why — with the four
open questions answered in a section at the end.

**Build AFTER the IUI benchmark manifest freeze; this mechanism must not
contaminate frozen numbers. It may appear in the paper's mechanism section
and Figure 1, never in the benchmark claims.**

## The idea (owner's, verbatim intent)

When an app registers an action, it can wrap the handler in ONE library
function and get the full capture envelope for free: before-invoke,
after-invoke, failure, settlement — plus event listeners on the action's
declared anchor. "Turn a UI action into a contextful action." One
registration, all the context we already talk about, no extra wiring.

The sentence the paper gets from this: **the anchor is bidirectional — the
same declaration that lets the agent actuate a control lets the library
listen to it.** One declaration, two directions: act and sense.

## What exists vs what this adds

| | exists today | D21 adds |
|---|---|---|
| Agent-mediated calls | `fire()` is the wrapper: guard-before, settle-after, throw→rejected | nothing new |
| Human-initiated calls | inference layer attributes what it can see | the SAME envelope: human firings of a wrapped action are captured first-class |
| Effect evidence | settlement taps; `effectStatus:'unobservable'` when tapless | anchor-scoped observation: events + mutations at the declared anchor widen what is honestly `observed` |
| Context around a call | none | before/after snapshots (key NAMES), failure capture, event trail |

## API shape (locked)

```ts
import { contextful } from 'hcifootprint';

registerActions(group, {
  'add-to-cart': contextful(addToCart, {
    // everything below optional; defaults are the honest minimum
    watch: true,            // attach listeners + MutationObserver at the declared anchor
    include: ['qty'],       // VALUE capture allowlist — nothing else ever carries values
    redact: app.redactor,   // app-owned; the library never invents a redaction policy
  }),
});
```

- `contextful(fn, opts?)` returns an instrumented handler the session
  recognizes. Plain verb, additive, severable: delete the wrapper and the
  app behaves identically (boundary law).
- No registration-level magic flag; the wrapper IS the opt-in, visible in
  the app's own code.

## Capture envelope (locked)

1. **before-invoke** — timestamp, cursor, guard READ-KEY names and their
   evaluation outcome. Key NAMES only; never values unless allowlisted.
2. **after-invoke** — settlement id, effectStatus, duration.
3. **failure** — error CLASS always; message only behind the allowlist
   (messages carry app data).
4. **anchor sensing** (when `watch`) — DOM listeners + one MutationObserver
   scoped to the declared anchor's subtree. Captured as
   `{type, targetRole, timestamp}`. **Never innerText/value by default.**

## The four laws this must obey (non-negotiable)

1. **Boundary law.** Key names and event types by default; values only via
   the app's explicit `include` + the app's own redactor. The library owns
   mechanism and honesty; the app owns meaning — and its data.
2. **Two-string firewall.** Everything captured is DATA-channel only. No
   captured string is ever composed into agent-facing prose. Injection
   through a captured `<div>` is the attack this rule kills.
3. **Sensing is evidence, not proof.** Listener-derived causality is stamped
   `cause.inferred` with the correlation rule recorded (event inside the
   invocation window → associated; outside → recorded as stimulus). React
   synthetic events, portals, shadow DOM make certainty impossible — the
   record says so instead of pretending.
4. **The blind spot stays honest.** Anchor sensing may upgrade
   `effectStatus` to `'observed'` only when a declared expectation matches
   an observed mutation. Value-CORRECTNESS remains out of scope — the
   measured 25% effect-wrong-value blind spot in the drift study stays a
   truthfully reported limitation; D21 must not half-close it.

## Attribution interaction (locked)

Anchor sensing feeds the EXISTING inference ladder as additional evidence.
The exactly-one rule is unchanged; ambiguity still abstains. More human
actions enter the record through the envelope; what the wrapper did not see
stays `unknown`. (This is the honest widening the IUI reviewer asked for in
place of "every state change attributed.")

## Open questions (decide at build time, not silently)

- Does `contextful()` also accept a bare selector for L0b apps with no
  registered handler (sense-only mode)?
- MutationObserver budget: cap + drop-with-count when an anchor subtree
  churns (virtualized lists).
- Does the transition record carry the event trail inline or by reference
  (record size vs. one-object convenience)?
- Name check against the current 1.5.x surface (actions/journeys vocabulary)
  before export.

## How they were answered (build, 2026-08-05)

1. **Sense-only: YES**, as `contextful.sense(anchor, opts?)` handed to
   `session.sense(actionId, …)` — the `declareHolds` shape (a declaration in,
   a release out). NOT a "bare selector": this library never resolves a locator
   to an element, so the app hands the element (or a getter) over, as it already
   does for `useControl`. It never registers a handler, because a bound no-op
   would make an unwired action look materialised to an agent.
2. **Budget: capped per invocation window with the count on the record** — 50
   changes examined (`changesDropped`), 200 events retained (`eventsDropped`).
3. **Trail: inline up to 20, then by reference**, and the record says which
   shape it used; `session.sensedTrail(transitionId)` answers for BOTH shapes,
   and retains the newest 20 oversized trails.
4. **Names**: `contextful` / `contextful.sense` on the root entry, against
   1.5.x's actions/journeys vocabulary — `TransitionRecord.captured` rather than
   anything spelled "context" (`contextBrief` is the prose surface this data may
   never reach, and one word for both would have invited exactly that bug).

### Two deviations from the spec text, both deliberate

- **`effectStatus` is not upgraded to `'observed'` (law 4).** DOM changes are
  delivered after a fire comes to rest, and this library's standing law is that
  a settlement receipt taken at rest is never rewritten (see
  `TransitionRecord.arrival`). So the observed-effect claim lands where the
  `'claimed' → 'observed'` arrival upgrade lands: on the LIVE record, alongside
  the receipt, as `captured.sensed.effect.status === 'observed'`. Same word, same
  honesty, no rewritten receipt — and `EffectStatus` keeps its four values, so no
  consumer's switch grows an arm.
- **`targetRole` + `targetTag`, not `targetRole` alone.** The capture reports the
  element's explicit `role` attribute (rung one of the sensor's ladder — "the app
  said so, and the app wins") and, separately, its tag name. The sensor's native
  semantics table is NOT duplicated into the root entry: `hcifootprint/sensor` is
  a separate entry point so a consumer who never names it never ships it, and a
  second copy of that table would have been two vocabularies for one word.
