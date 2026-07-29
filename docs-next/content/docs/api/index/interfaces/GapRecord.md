---
title: GapRecord
---

# Interface: GapRecord

Defined in: [src/atom/types.ts:825](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L825)

One row of unmet demand. Four kinds:
- 'fire-rejected'      — an attempted action the session refused (unknown id,
  failed guard, wrong page, stale plan, bad payload). Recorded automatically.
- 'reported'           — an ask no available action or skill could serve,
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

Rows are deliberately TOKEN-LEAN and structured — the ask plus NAME lists,
never descriptions or transcripts — so a consumer's batch triage LLM can
cluster thousands of them cheaply to discover which skills/tools to build
next. `request` is runtime data (user text): export it as data, never feed
it to a planner as instructions.

Triage notes: rows with rejectionReason 'STALE_CURSOR' are usually
optimistic-concurrency retries that SUCCEEDED on replan — filter or
down-weight them; they are cursor-protocol events, not missing capability.
`availableActions` lists full capability at that position (not narrowed by
any open skill frame). The ledger grows unbounded for the session's life —
export via onGap and drain, like the transition log.

## Properties

### affordanceId?

> `optional` **affordanceId?**: `string`

Defined in: [src/atom/types.ts:850](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L850)

The id the caller ASKED for — kept even when unknown (that is the signal).

***

### availableActions

> **availableActions**: `string`[]

Defined in: [src/atom/types.ts:835](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L835)

Names only — what existed at that moment (token-lean, injection-safe).
On a 'dead-end' row this is the whole payload and the whole point: these
are the actions the page OFFERS while none of them can act.

***

### availableSkills

> **availableSkills**: `string`[]

Defined in: [src/atom/types.ts:836](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L836)

***

### evidence?

> `optional` **evidence?**: `FilterCondition`[]

Defined in: [src/atom/types.ts:867](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L867)

***

### gestureKind?

> `optional` **gestureKind?**: `"element"` \| `"keychord"` \| `"programmatic"` \| `"url"` \| `"tab"`

Defined in: [src/atom/types.ts:874](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L874)

The refused edge's declared gesture KIND ('fire-rejected' and
'unmaterialized-fire' rows) — the demand backlog now says WHICH wiring is
missing (a click handler vs a navigate fn). Token-lean by design: the kind
string only, never the binding object.

***

### kind

> **kind**: `"fire-rejected"` \| `"reported"` \| `"unmaterialized-fire"` \| `"dead-end"`

Defined in: [src/atom/types.ts:826](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L826)

***

### node

> **node**: `string`

Defined in: [src/atom/types.ts:828](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L828)

***

### note?

> `optional` **note?**: `string`

Defined in: [src/atom/types.ts:885](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L885)

***

### offGraph?

> `optional` **offGraph?**: `true`

Defined in: [src/atom/types.ts:847](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L847)

The cursor is resting on a node the graph has never heard of — the same
fact [SyncResult](/api/index/type-aliases/SyncResult).offGraph reports, kept on the row so triage can
separate the two traps without re-deriving it. It is the PERMANENT one: no
mount can add a door to an unauthored page (registerToolGroup throws on an
unknown node), so it is recorded ONCE per node for the session's life
rather than re-asked on every structure change. Cure: author the page, or
sync() the id the graph actually uses for that screen.

***

### principal?

> `optional` **principal?**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:866](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L866)

***

### reason?

> `optional` **reason?**: [`GapReason`](/api/index/type-aliases/GapReason)

Defined in: [src/atom/types.ts:884](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L884)

***

### rejectionReason?

> `optional` **rejectionReason?**: `"UNKNOWN_AFFORDANCE"` \| `"STALE_CURSOR"` \| `"NOT_ON_NODE"` \| `"GUARD_FAILED"` \| `"PAYLOAD_INVALID"` \| `"BLOCKED_BY_OVERLAY"` \| `"NODE_NOT_VISIBLE"` \| `"STILL_MOUNTING"` \| `"INSTANCE_REQUIRED"` \| `"INSTANCE_UNKNOWN"` \| `"TOOL_DISABLED"` \| `"NOT_MATERIALIZED"` \| `"ENTRY_NOT_MATERIALIZED"`

Defined in: [src/atom/types.ts:851](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L851)

***

### request?

> `optional` **request?**: `string`

Defined in: [src/atom/types.ts:883](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L883)

The user's ask (runtime data; length-capped).

***

### skillId?

> `optional` **skillId?**: `string`

Defined in: [src/atom/types.ts:880](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L880)

The skill whose commit was refused (ENTRY_NOT_MATERIALIZED rows) —
`affordanceId` on those rows is the entry STEP; this names the skill the
planner actually asked for.

***

### timestamp

> **timestamp**: `number`

Defined in: [src/atom/types.ts:827](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L827)

***

### version

> **version**: `number`

Defined in: [src/atom/types.ts:829](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L829)
