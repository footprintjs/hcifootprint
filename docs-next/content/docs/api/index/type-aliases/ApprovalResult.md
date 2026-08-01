---
title: ApprovalResult
---

# Type Alias: ApprovalResult

> **ApprovalResult** = \{ `ok`: `true`; `record`: [`ConfirmRecord`](/api/index/interfaces/ConfirmRecord); \} \| \{ `explanation`: `string`; `ok`: `false`; `reason`: `"UNKNOWN_ASK"` \| `"ASK_ALREADY_ANSWERED"` \| `"NEEDS_DECIDER"` \| `"NOT_ENFORCED"`; \}

Defined in: [src/atom/types.ts:1669](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1669)

What one of the human-side approval doors did — [Session.approveAsk](/api/index/classes/Session#approveask),
[Session.declineAsk](/api/index/classes/Session#declineask), [Session.alwaysApprove](/api/index/classes/Session#alwaysapprove),
[Session.revokeAlwaysApprove](/api/index/classes/Session#revokealwaysapprove).

A typed REFUSAL rather than a throw, because these run inside click handlers: a
button that throws takes the page down, while a button that reports gets to
show the person what went wrong.

## Union Members

### Type Literal

\{ `ok`: `true`; `record`: [`ConfirmRecord`](/api/index/interfaces/ConfirmRecord); \}

***

### Type Literal

\{ `explanation`: `string`; `ok`: `false`; `reason`: `"UNKNOWN_ASK"` \| `"ASK_ALREADY_ANSWERED"` \| `"NEEDS_DECIDER"` \| `"NOT_ENFORCED"`; \}

#### explanation

> **explanation**: `string`

One authored sentence naming the cure.

#### ok

> **ok**: `false`

#### reason

> **reason**: `"UNKNOWN_ASK"` \| `"ASK_ALREADY_ANSWERED"` \| `"NEEDS_DECIDER"` \| `"NOT_ENFORCED"`

- `'UNKNOWN_ASK'`          — no such ask (or no such standing grant).
- `'ASK_ALREADY_ANSWERED'` — a decision is already recorded; nothing here
  ever overwrites one.
- `'NEEDS_DECIDER'`        — `by` is required: an approval whose decider is
  unknown is the very claim-as-fact this closes.
- `'NOT_ENFORCED'`         — the session was not created with
  requireHumanApproval, so this row would authorize nothing.
