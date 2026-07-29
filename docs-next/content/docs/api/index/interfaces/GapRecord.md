---
title: GapRecord
---

# Interface: GapRecord

Defined in: [src/atom/types.ts:686](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L686)

One row of unmet demand. Three kinds:
- 'fire-rejected'      — an attempted action the session refused (unknown id,
  failed guard, wrong page, stale plan, bad payload). Recorded automatically.
- 'reported'           — an ask no available action or skill could serve,
  reported explicitly (typically by the agent's report_gap tool).
- 'unmaterialized-fire' — an ALLOWED no-op agent fire: the session runs with
  `allowUnmaterializedFires` (a guide/tour flow) and the tool it fired has no
  binding, so nothing executed. Nothing was refused and nobody reported it —
  it is the binding still to build. Tour rows are the demand backlog for
  Phase-1 wiring: cluster them to see which handlers agents keep reaching for.

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

Defined in: [src/atom/types.ts:696](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L696)

The id the caller ASKED for — kept even when unknown (that is the signal).

***

### availableActions

> **availableActions**: `string`[]

Defined in: [src/atom/types.ts:692](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L692)

Names only — what existed at that moment (token-lean, injection-safe).

***

### availableSkills

> **availableSkills**: `string`[]

Defined in: [src/atom/types.ts:693](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L693)

***

### evidence?

> `optional` **evidence?**: `FilterCondition`[]

Defined in: [src/atom/types.ts:713](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L713)

***

### gestureKind?

> `optional` **gestureKind?**: `"element"` \| `"keychord"` \| `"programmatic"` \| `"url"` \| `"tab"`

Defined in: [src/atom/types.ts:720](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L720)

The refused edge's declared gesture KIND ('fire-rejected' and
'unmaterialized-fire' rows) — the demand backlog now says WHICH wiring is
missing (a click handler vs a navigate fn). Token-lean by design: the kind
string only, never the binding object.

***

### kind

> **kind**: `"fire-rejected"` \| `"reported"` \| `"unmaterialized-fire"`

Defined in: [src/atom/types.ts:687](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L687)

***

### node

> **node**: `string`

Defined in: [src/atom/types.ts:689](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L689)

***

### note?

> `optional` **note?**: `string`

Defined in: [src/atom/types.ts:731](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L731)

***

### principal?

> `optional` **principal?**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:712](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L712)

***

### reason?

> `optional` **reason?**: [`GapReason`](/api/index/type-aliases/GapReason)

Defined in: [src/atom/types.ts:730](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L730)

***

### rejectionReason?

> `optional` **rejectionReason?**: `"UNKNOWN_AFFORDANCE"` \| `"STALE_CURSOR"` \| `"NOT_ON_NODE"` \| `"GUARD_FAILED"` \| `"PAYLOAD_INVALID"` \| `"BLOCKED_BY_OVERLAY"` \| `"NODE_NOT_VISIBLE"` \| `"STILL_MOUNTING"` \| `"INSTANCE_REQUIRED"` \| `"INSTANCE_UNKNOWN"` \| `"TOOL_DISABLED"` \| `"NOT_MATERIALIZED"` \| `"ENTRY_NOT_MATERIALIZED"`

Defined in: [src/atom/types.ts:697](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L697)

***

### request?

> `optional` **request?**: `string`

Defined in: [src/atom/types.ts:729](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L729)

The user's ask (runtime data; length-capped).

***

### skillId?

> `optional` **skillId?**: `string`

Defined in: [src/atom/types.ts:726](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L726)

The skill whose commit was refused (ENTRY_NOT_MATERIALIZED rows) —
`affordanceId` on those rows is the entry STEP; this names the skill the
planner actually asked for.

***

### timestamp

> **timestamp**: `number`

Defined in: [src/atom/types.ts:688](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L688)

***

### version

> **version**: `number`

Defined in: [src/atom/types.ts:690](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L690)
