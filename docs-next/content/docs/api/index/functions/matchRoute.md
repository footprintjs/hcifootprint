---
title: matchRoute
---

# Function: matchRoute()

> **matchRoute**(`pages`, `urlPath`): `string` \| `undefined`

Defined in: [src/graph/route-match.ts:105](https://github.com/footprintjs/hcifootprint/blob/main/src/graph/route-match.ts#L105)

Find the page whose declared route best describes `urlPath`, or `undefined`.

`urlPath` is a PATHNAME ('/orders/123'), not a full URL — an origin would
become two leading segments and match nothing, which is the honest outcome
for an input this cannot read.

Precedence, in order, all three deterministic:
  1. most literal segments — '/orders/new' beats '/orders/:id' for '/orders/new';
  2. then the longer route string;
  3. then the first page declared.

Rules 2 and 3 exist to make the answer STABLE, not because a longer pattern
or an earlier declaration means more: two routes that reach this point are
genuinely ambiguous, and an app that hits it has authored two names for one
URL. Stable-and-documented beats correct-looking-and-arbitrary — the same
path must resolve to the same page on every call and in every process, or a
session's cursor depends on iteration order. (Rule 3 reads the pages object's
own key order, which for ordinary page ids is the order they were written.)

## Parameters

### pages

[`RoutedPages`](/api/index/type-aliases/RoutedPages)

### urlPath

`string`

## Returns

`string` \| `undefined`
