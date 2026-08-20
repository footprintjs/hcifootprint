---
title: Observability
---

# Type Alias: Observability

> **Observability** = `"state-delta"` \| `"postcondition"` \| `"navigation"` \| `"external"` \| `"unobservable"`

Defined in: [src/atom/types.ts:286](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L286)

HOW WOULD ANYONE SEE THAT THIS ACTION HAPPENED — the app's own answer,
declared once next to the action.

Five words, and the split that matters runs between the first two:
- `'state-delta'`   — the declared `writes` appear in a reported delta. THIS
  IS KEY PRESENCE, NOT VALUE CORRECTNESS: a handler that wrote `orderId:
  null` satisfies it exactly as a real order does. Nothing in this library
  ever claims more of it, and [EffectPolicy](/api/index/interfaces/EffectPolicy) refuses it as a
  verification for precisely that reason.
- `'postcondition'` — the app declared a [VerifyContract](/api/index/type-aliases/VerifyContract): a real check,
  asked once, at settlement.
- `'navigation'`    — the effect IS page motion, to the destination the action
  declares. Corroborated by a later `sync()` ([TransitionRecord.arrival](/api/index/interfaces/TransitionRecord#arrival)),
  which is corroboration and never causal proof.
- `'external'`      — it happens somewhere this client cannot see (a payment
  processor, a queue). The app reports completion through
  [Session.observeEffect](/api/index/classes/Session#observeeffect); the library records the reference and invents
  nothing.
- `'unobservable'`  — the app itself says nobody can tell from here. An honest
  answer, and the one a high-effect policy will not accept.

DECLARED, NEVER INFERRED — the law `writes` and `reads` live under. The
library does not read your handler, watch the DOM, or promote a `writes` list
into an answer. An app that declares nothing behaves and serves identically.
