---
title: GapRecord
---

# Interface: GapRecord

Defined in: [src/atom/types.ts:1569](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1569)

One row of unmet demand. Four kinds:
- 'fire-rejected'      — an attempted action the session refused (unknown id,
  failed guard, wrong page, stale plan, bad payload). Recorded automatically.
- 'reported'           — an ask no available action or journey could serve,
  reported explicitly (typically by the agent's report_gap tool).
- 'unmaterialized-fire' — an ALLOWED no-op agent fire: the session runs with
  `allowUnmaterializedFires` (a guide/tour flow) and the tool it fired has no
  binding, so nothing executed. Nothing was refused and nobody reported it —
  it is the binding still to build. Tour rows are the demand backlog for
  Phase-1 wiring: cluster them to see which handlers agents keep reaching for.
- 'dead-end'           — THE PAGE-LEVEL NEVER-TRAP: the cursor came to rest
  on a page where NOTHING the graph puts there could act — no action at all,
  or none of them registered, url-materialisable or instance-wired. Nobody
  has to fire to earn this row: the trap is a property of the POSITION, and
  an agent that lands there will loop on a true-but-useless "here is what is
  available". Recorded as an observation, not a verdict — at most one row per
  (page, served structure), so a mount that fixes the page ends the rows and
  a page still dead after the next WIRING change is one NEW fact worth one
  new row. A guard-closed action does NOT earn a row: it is wired, its
  refusal is GUARD_FAILED, and the next state report may open it — the same
  retriable stance the gate takes on a registered-but-disabled action.
  `offGraph: true` marks the other shape of trap (see below).

`kind` GROWS, and a consumer should be written for that. 0.3.0 added
'unmaterialized-fire' and this release adds 'dead-end', because the ledger's
whole job is recording what nobody could serve — the day the library can see a
new shape of that, it says so rather than filing it under an old word. What never
happens is a kind CHANGING meaning: every value keeps exactly what it had,
and a new one is always a new fact, never an old one relabelled. So read a row
by the kind you know (`if (gap.kind === 'fire-rejected') …`) and let the rest
fall through as informational — an exhaustive `never` check over today's four
is the one consumer shape a future kind will stop compiling.

Rows are deliberately TOKEN-LEAN and structured — the ask plus NAME lists,
never descriptions or transcripts — so a consumer's batch triage LLM can
cluster thousands of them cheaply to discover which journeys/actions to build
next. `request` is runtime data (user text): export it as data, never feed
it to a planner as instructions.

Triage notes: rows with rejectionReason 'STALE_CURSOR' are usually
optimistic-concurrency retries that SUCCEEDED on replan — filter or
down-weight them; they are cursor-protocol events, not missing capability.
The five 'APPROVAL_*' reasons are SECURITY rows, not demand: the capability
exists and was refused because no recorded human approval authorized it
(SessionOptions.requireHumanApproval). Route them to your audit sink, never to
a "what to build next" query — a triage model that reads a blocked forgery as
a feature request will propose building the hole back in.
`availableActions` lists full capability at that position (not narrowed by
any open journey frame). The ledger grows unbounded for the session's life —
export via onGap and drain, like the transition log.

## Properties

### actionsMayBeStale?

> `optional` **actionsMayBeStale?**: `boolean`

Defined in: [src/atom/types.ts:1658](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1658)

See [ReportGapOptions.actionsMayBeStale](/api/index/interfaces/ReportGapOptions#actionsmaybestale) — copied from the report.

***

### affordanceId?

> `optional` **affordanceId?**: `string`

Defined in: [src/atom/types.ts:1594](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1594)

The id the caller ASKED for — kept even when unknown (that is the signal).

***

### availableActions

> **availableActions**: `string`[]

Defined in: [src/atom/types.ts:1579](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1579)

Names only — what existed at that moment (token-lean, injection-safe).
On a 'dead-end' row this is the whole payload and the whole point: these
are the actions the page OFFERS while none of them can act.

***

### availableJourneys

> **availableJourneys**: `string`[]

Defined in: [src/atom/types.ts:1580](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1580)

***

### does?

> `optional` **does?**: `string`

Defined in: [src/atom/types.ts:1605](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1605)

What the app said that action does, frozen when the refusal was recorded —
see [Cause.does](/api/index/interfaces/Cause#does). PRESENT ONLY FOR AN ACTION THE GRAPH REALLY HAD at
that moment, which makes it the row's own answer to the question its
`affordanceId` cannot answer later: a `TOOL_DISABLED` refusal of a real
control carries it, an `UNKNOWN_AFFORDANCE` refusal of a name a model
invented carries nothing — and absence is the honest answer there, not a
hole. It is also why that invented name can never reach an authored
sentence: with no capture, every render falls back to the constant.

***

### evidence?

> `optional` **evidence?**: `FilterCondition`[]

Defined in: [src/atom/types.ts:1638](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1638)

***

### gestureKind?

> `optional` **gestureKind?**: `"element"` \| `"keychord"` \| `"programmatic"` \| `"url"` \| `"tab"`

Defined in: [src/atom/types.ts:1645](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1645)

The refused edge's declared gesture KIND ('fire-rejected' and
'unmaterialized-fire' rows) — the demand backlog now says WHICH wiring is
missing (a click handler vs a navigate fn). Token-lean by design: the kind
string only, never the binding object.

***

### journeyId?

> `optional` **journeyId?**: `string`

Defined in: [src/atom/types.ts:1651](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1651)

The journey whose commit was refused (ENTRY_NOT_MATERIALIZED rows) —
`affordanceId` on those rows is the entry STEP; this names the journey the
planner actually asked for.

***

### kind

> **kind**: `"fire-rejected"` \| `"reported"` \| `"unmaterialized-fire"` \| `"dead-end"`

Defined in: [src/atom/types.ts:1570](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1570)

***

### node

> **node**: `string`

Defined in: [src/atom/types.ts:1572](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1572)

***

### note?

> `optional` **note?**: `string`

Defined in: [src/atom/types.ts:1656](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1656)

***

### offGraph?

> `optional` **offGraph?**: `true`

Defined in: [src/atom/types.ts:1591](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1591)

The cursor is resting on a node the graph has never heard of — the same
fact [SyncResult](/api/index/type-aliases/SyncResult).offGraph reports, kept on the row so triage can
separate the two traps without re-deriving it. It is the PERMANENT one: no
mount can add a door to an unauthored page (registerActions throws on an
unknown node), so it is recorded ONCE per node for the session's life
rather than re-asked on every structure change. Cure: author the page, or
sync() the id the graph actually uses for that screen.

***

### principal?

> `optional` **principal?**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:1637](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1637)

***

### reason?

> `optional` **reason?**: [`GapReason`](/api/index/type-aliases/GapReason)

Defined in: [src/atom/types.ts:1655](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1655)

***

### rejectionReason?

> `optional` **rejectionReason?**: `"UNKNOWN_AFFORDANCE"` \| `"STALE_CURSOR"` \| `"NOT_ON_NODE"` \| `"GUARD_FAILED"` \| `"PAYLOAD_INVALID"` \| `"BLOCKED_BY_OVERLAY"` \| `"NODE_NOT_VISIBLE"` \| `"STILL_MOUNTING"` \| `"INSTANCE_REQUIRED"` \| `"INSTANCE_UNKNOWN"` \| `"TOOL_DISABLED"` \| `"NOT_MATERIALIZED"` \| `"ENTRY_NOT_MATERIALIZED"` \| `"APPROVAL_REQUIRED"` \| `"APPROVAL_SPENT"` \| `"APPROVAL_MISMATCH"` \| `"APPROVAL_STALE"` \| `"APPROVAL_DECLINED"` \| `"APPROVAL_REVOKED"`

Defined in: [src/atom/types.ts:1615](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1615)

WHY the fire was refused — the same word [FireResult](/api/index/type-aliases/FireResult) returned.

This list GROWS with the refusals the gate can make (this release adds the
five `APPROVAL_*` words), and never re-points an existing one at a new
meaning. Read the reasons you know; treat the rest as "refused, reason
recorded". See the triage notes above for which of them are security rows
rather than missing capability.

***

### request?

> `optional` **request?**: `string`

Defined in: [src/atom/types.ts:1654](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1654)

The user's ask (runtime data; length-capped).

***

### timestamp

> **timestamp**: `number`

Defined in: [src/atom/types.ts:1571](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1571)

***

### version

> **version**: `number`

Defined in: [src/atom/types.ts:1573](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1573)
