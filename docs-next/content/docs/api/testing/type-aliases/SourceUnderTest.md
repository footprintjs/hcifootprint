---
title: SourceUnderTest
---

# Type Alias: SourceUnderTest

> **SourceUnderTest** = (`fixture`) => [`GraphSource`](/api/index/type-aliases/GraphSource)

Defined in: [src/testing/conform.ts:615](https://github.com/footprintjs/hcifootprint/blob/main/src/testing/conform.ts#L615)

The source to put under test — a ONE-LINE FACTORY, not a source value, and the
asymmetry is the whole method.

A graph source is a SNAPSHOT: it read the app's truth once and closed over it,
and it has no input door afterwards. So "did you carry every field?" is a
question a finished source cannot be asked — the helper has to be the one
holding the declaration, hand it in, and go looking for it on the way out.
`(fixture) => fromLiveStore(fixture.store)` is that hand-in, and it is why a
field dropped ANYWHERE — inside the factory, at compile, at serve — is a field
this can name.

Taking a finished value instead would answer a narrower question while looking
like it answered this one: a source publishing no `verify` and a source that
dropped one are the same bytes, so a report over a value would call the bug a
pass. That is the silence this whole module exists to end, so the door is not
offered.

## Parameters

### fixture

[`ConformanceFixture`](/api/testing/interfaces/ConformanceFixture)

## Returns

[`GraphSource`](/api/index/type-aliases/GraphSource)
