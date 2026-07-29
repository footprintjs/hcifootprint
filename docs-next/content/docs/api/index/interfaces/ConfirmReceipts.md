---
title: ConfirmReceipts
---

# Interface: ConfirmReceipts

Defined in: [src/atom/types.ts:956](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L956)

The "receipts" that ride a needs-confirm ask: everything the library ALREADY
knows about a high-effect edge, assembled so the agent can SHOW the human
what they are approving — no new capture, no extra work.

Field kinship with agentfootprint's checkIn evidence is deliberate
(`willDo` ≙ willDo, `because` ≙ read/drivers, `recentSteps` ≙ trail) so a
consumer wiring both libraries sees ONE mental model — but nothing is
imported across, and the substance differs on purpose: an AGENT's evidence
SCORES which context probably drove a guessed tool choice; a UI SESSION KNOWS
why an edge is fireable — the guard is the literal precondition — so
`because` is structural guard evidence, never a ranked guess.

## Properties

### because

> **because**: `FilterCondition`[]

Defined in: [src/atom/types.ts:964](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L964)

Why this edge is fireable right now — the guard conditions that passed,
one per condition (key/op/threshold/actual). Structural and KNOWN, not
scored. Empty for an unguarded (always-offered) edge.

***

### becauseUnevaluated?

> `optional` **becauseUnevaluated?**: `string`[]

Defined in: [src/atom/types.ts:969](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L969)

Guard keys taken on faith because the state view never held them — the
same honesty marker the edge itself carries. Present only when non-empty.

***

### recentSteps

> **recentSteps**: [`ConfirmTrailStep`](/api/index/interfaces/ConfirmTrailStep)[]

Defined in: [src/atom/types.ts:975](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L975)

A compact tail of the session's fire journal — the trail that led here.

***

### version

> **version**: `number`

Defined in: [src/atom/types.ts:973](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L973)

The cursor version the receipt was assembled at (a stale-plan check anchor).

***

### willDo

> **willDo**: [`ConfirmWillDo`](/api/index/interfaces/ConfirmWillDo)

Defined in: [src/atom/types.ts:958](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L958)

What firing will do: authored words + declared, honesty-tagged effect.

***

### youAreOn

> **youAreOn**: `string`

Defined in: [src/atom/types.ts:971](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L971)

Where the human is, folded in so the receipt is a self-contained pack.
