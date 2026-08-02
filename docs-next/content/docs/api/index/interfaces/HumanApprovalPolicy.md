---
title: HumanApprovalPolicy
---

# Interface: HumanApprovalPolicy

Defined in: [src/atom/types.ts:450](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L450)

How strict [SessionOptions.requireHumanApproval](/api/index/interfaces/SessionOptions#requirehumanapproval) is about a yes given a
while ago, or in a world that has since moved on.

BOTH RULES DEFAULT OFF, and that is a deliberate honesty position rather than
laziness. The library records the stamps ALWAYS — every enforced row carries
its timestamp and the state version the human decided at — but whether a stamp
is DISQUALIFYING is a product decision it cannot make for you: approving a
refund may legitimately take four minutes, and in a live-tapped app the state
version moves on almost every report. Recording a fact you can act on, while
refusing to guess the threshold, is the same stance the guard evidence takes.

## Properties

### expiresAfterMs?

> `optional` **expiresAfterMs?**: `number`

Defined in: [src/atom/types.ts:452](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L452)

Refuse an approval the human gave longer ago than this. Default: no time limit.

***

### refuseWhenWorldMoved?

> `optional` **refuseWhenWorldMoved?**: `boolean`

Defined in: [src/atom/types.ts:458](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L458)

Refuse an approval given before the app's state moved on. Compares
`stateVersion` — not `version`, which also bumps on served-structure changes
and on the fire itself. Default false.
