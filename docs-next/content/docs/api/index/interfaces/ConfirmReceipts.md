---
title: ConfirmReceipts
---

# Interface: ConfirmReceipts

Defined in: [src/atom/types.ts:1581](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1581)

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

Defined in: [src/atom/types.ts:1589](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1589)

Why this edge is fireable right now — the guard conditions that passed,
one per condition (key/op/threshold/actual). Structural and KNOWN, not
scored. Empty for an unguarded (always-offered) edge.

***

### becauseUnevaluated?

> `optional` **becauseUnevaluated?**: `string`[]

Defined in: [src/atom/types.ts:1594](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1594)

Guard keys taken on faith because the state view never held them — the
same honesty marker the edge itself carries. Present only when non-empty.

***

### recentSteps

> **recentSteps**: [`ConfirmTrailStep`](/api/index/interfaces/ConfirmTrailStep)[]

Defined in: [src/atom/types.ts:1608](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1608)

A compact tail of the session's fire journal — the trail that led here.

***

### version

> **version**: `number`

Defined in: [src/atom/types.ts:1606](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1606)

The cursor version the receipt was assembled at (a stale-plan check anchor).

***

### willDo

> **willDo**: [`ConfirmWillDo`](/api/index/interfaces/ConfirmWillDo)

Defined in: [src/atom/types.ts:1583](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1583)

What firing will do: authored words + declared, honesty-tagged effect.

***

### willUse?

> `optional` **willUse?**: [`ConfirmWillUse`](/api/index/interfaces/ConfirmWillUse)

Defined in: [src/atom/types.ts:1602](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1602)

What this fire will SEND — the input and instance on the card. Present when
the ask was told them (the serving layer passes them; a bare `confirmAsk`
with no input has nothing to show). Under
[SessionOptions.requireHumanApproval](/api/index/interfaces/SessionOptions#requirehumanapproval) this is what the approval BINDS
to: a later fire carrying anything else is refused.

***

### youAreOn

> **youAreOn**: `string`

Defined in: [src/atom/types.ts:1604](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1604)

Where the human is, folded in so the receipt is a self-contained pack.
