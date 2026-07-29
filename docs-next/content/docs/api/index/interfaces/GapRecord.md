---
title: GapRecord
---

# Interface: GapRecord

Defined in: [src/atom/types.ts:702](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L702)

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
  on a page where an agent fire of EVERY served action would refuse
  NOT_MATERIALIZED (no actions at all, or none of them registered,
  url-materialisable or instance-wired). Nobody has to fire to earn this row:
  the trap is a property of the POSITION, and an agent that lands there will
  loop on a true-but-useless "here is what is available". Recorded as an
  observation, not a verdict — at most one row per (page, structureVersion),
  so a mount that fixes the page ends the rows and a page still dead after
  the next structure change is one NEW fact worth one new row.

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

Defined in: [src/atom/types.ts:716](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L716)

The id the caller ASKED for — kept even when unknown (that is the signal).

***

### availableActions

> **availableActions**: `string`[]

Defined in: [src/atom/types.ts:712](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L712)

Names only — what existed at that moment (token-lean, injection-safe).
On a 'dead-end' row this is the whole payload and the whole point: these
are the actions the page OFFERS while none of them can act.

***

### availableSkills

> **availableSkills**: `string`[]

Defined in: [src/atom/types.ts:713](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L713)

***

### evidence?

> `optional` **evidence?**: `FilterCondition`[]

Defined in: [src/atom/types.ts:733](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L733)

***

### gestureKind?

> `optional` **gestureKind?**: `"element"` \| `"keychord"` \| `"programmatic"` \| `"url"` \| `"tab"`

Defined in: [src/atom/types.ts:740](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L740)

The refused edge's declared gesture KIND ('fire-rejected' and
'unmaterialized-fire' rows) — the demand backlog now says WHICH wiring is
missing (a click handler vs a navigate fn). Token-lean by design: the kind
string only, never the binding object.

***

### kind

> **kind**: `"fire-rejected"` \| `"reported"` \| `"unmaterialized-fire"` \| `"dead-end"`

Defined in: [src/atom/types.ts:703](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L703)

***

### node

> **node**: `string`

Defined in: [src/atom/types.ts:705](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L705)

***

### note?

> `optional` **note?**: `string`

Defined in: [src/atom/types.ts:751](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L751)

***

### principal?

> `optional` **principal?**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:732](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L732)

***

### reason?

> `optional` **reason?**: [`GapReason`](/api/index/type-aliases/GapReason)

Defined in: [src/atom/types.ts:750](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L750)

***

### rejectionReason?

> `optional` **rejectionReason?**: `"UNKNOWN_AFFORDANCE"` \| `"STALE_CURSOR"` \| `"NOT_ON_NODE"` \| `"GUARD_FAILED"` \| `"PAYLOAD_INVALID"` \| `"BLOCKED_BY_OVERLAY"` \| `"NODE_NOT_VISIBLE"` \| `"STILL_MOUNTING"` \| `"INSTANCE_REQUIRED"` \| `"INSTANCE_UNKNOWN"` \| `"TOOL_DISABLED"` \| `"NOT_MATERIALIZED"` \| `"ENTRY_NOT_MATERIALIZED"`

Defined in: [src/atom/types.ts:717](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L717)

***

### request?

> `optional` **request?**: `string`

Defined in: [src/atom/types.ts:749](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L749)

The user's ask (runtime data; length-capped).

***

### skillId?

> `optional` **skillId?**: `string`

Defined in: [src/atom/types.ts:746](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L746)

The skill whose commit was refused (ENTRY_NOT_MATERIALIZED rows) —
`affordanceId` on those rows is the entry STEP; this names the skill the
planner actually asked for.

***

### timestamp

> **timestamp**: `number`

Defined in: [src/atom/types.ts:704](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L704)

***

### version

> **version**: `number`

Defined in: [src/atom/types.ts:706](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L706)
