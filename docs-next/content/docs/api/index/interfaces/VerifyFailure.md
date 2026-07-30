---
title: VerifyFailure
---

# Interface: VerifyFailure

Defined in: [src/atom/types.ts:154](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L154)

Why a settlement said 'refused' when the app's own verify contract found
nothing had happened. Rides [FireSettlement.error](/api/index/interfaces/FireSettlement#error) — the same field a
thrown handler's error rides, because to a caller both mean "the app did not
do the thing", and one branch should read both.

## Properties

### evidence?

> `optional` **evidence?**: `FilterCondition`[]

Defined in: [src/atom/types.ts:163](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L163)

The conditions that did NOT hold (declarative form only). Absent for a
predicate: it answers yes or no and hands over no conditions, so naming one
would be a guess about code the library cannot see.

***

### explanation

> **explanation**: `string`

Defined in: [src/atom/types.ts:157](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L157)

An authored constant naming the contract — safe to show a model verbatim.

***

### reason

> **reason**: `"VERIFY_FAILED"`

Defined in: [src/atom/types.ts:155](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L155)
