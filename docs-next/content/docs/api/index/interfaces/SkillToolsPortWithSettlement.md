---
title: SkillToolsPortWithSettlement
---

# Interface: SkillToolsPortWithSettlement

Defined in: [src/serve/modes.ts:160](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L160)

What [skillsAsTools](/api/index/functions/skillsAsTools) returns: a port whose settlement doors are always
there. Name the type only if you are storing the port somewhere typed — the
factory's inferred return already has them.

## Extends

- [`SkillToolsPort`](/api/index/interfaces/SkillToolsPort)

## Methods

### call()

> **call**(`name`, `args?`): [`ServeResult`](/api/index/type-aliases/ServeResult)

Defined in: [src/serve/modes.ts:96](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L96)

Route a tool_use by name. Unknown names return a structured error result.

#### Parameters

##### name

`string`

##### args?

`unknown`

#### Returns

[`ServeResult`](/api/index/type-aliases/ServeResult)

#### Inherited from

[`SkillToolsPort`](/api/index/interfaces/SkillToolsPort).[`call`](/api/index/interfaces/SkillToolsPort#call)

***

### settledAnswer()

> **settledAnswer**(`transitionId`): [`ServeResult`](/api/index/type-aliases/ServeResult) \| `undefined`

Defined in: [src/serve/modes.ts:162](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L162)

What `did_it_work` would ANSWER about a fire that has come to rest — the
same facts, in the same words, minus that tool's own envelope. For the
caller that already holds the id and wants the settled truth as a result
rather than as a promise: a transport folding the final word into the
result of the call that fired (see [SkillToolsPort.whenSettled](/api/index/interfaces/SkillToolsPort#whensettled) for
the wait itself).

Three answers, and they are three different things:
- the facts, for a fire at rest;
- `undefined` while the fire is still in flight — "no answer yet", never a
  guessed one;
- a synchronous THROW, on the two ids no honest answer exists for: one no
  settlement can ever exist for (the same law [Session.settlementOf](/api/index/classes/Session#settlementof)
  holds), and one that names BOTH a fire and a human's open card, which
  `did_it_work` refuses as `AMBIGUOUS_ID` and this door refuses in the same
  words. A mistyped id refused by name is the whole point: the alternative
  is silence a caller reads as "not finished", which is how a wrong id
  becomes a confident wrong answer.

The keys are the ones `did_it_work` documents (`effectStatus`, `outcome`,
`outcomeNow`, `effectVerified`, `writesObserved`, `verifyHeld`, `arrival`,
`arrivalMeans`, `materialized`, `why`, `toNode`, `error`, `data`,
`stillWorking`, `stillWorkingMeans`, and `howToAct` on a moved outcome) —
absent when unknown, never filled in. A LIST IS A THING THAT GOES STALE, so
the one a remote host reads is checked against a real answer by a test
rather than kept in step by hand.

OPTIONAL here and REQUIRED on [SkillToolsPortWithSettlement](/api/index/interfaces/SkillToolsPortWithSettlement), for the
reason stated above: this interface is PUBLISHED, and an object literal
written against an earlier release must keep compiling.

#### Parameters

##### transitionId

`string`

#### Returns

[`ServeResult`](/api/index/type-aliases/ServeResult) \| `undefined`

#### Overrides

[`SkillToolsPort`](/api/index/interfaces/SkillToolsPort).[`settledAnswer`](/api/index/interfaces/SkillToolsPort#settledanswer)

***

### tools()

> **tools**(): `MCPToolDescription`[]

Defined in: [src/serve/modes.ts:94](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L94)

The STATIC tool array — identical bytes for the life of the conversation.

#### Returns

`MCPToolDescription`[]

#### Inherited from

[`SkillToolsPort`](/api/index/interfaces/SkillToolsPort).[`tools`](/api/index/interfaces/SkillToolsPort#tools)

***

### whenSettled()

> **whenSettled**(`transitionId`): `Promise`\<[`FireSettlement`](/api/index/interfaces/FireSettlement)\>

Defined in: [src/serve/modes.ts:161](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L161)

How a fire came to rest — the ASYNC door, for the caller that holds this
port and nothing else (a relay, a transport wrapper). `call()` is
synchronous by contract and answers with the truth AT RETURN TIME; this is
the later truth, delegated straight to [Session.settlementOf](/api/index/classes/Session#settlementof) with
its laws intact: never rejects, first settlement wins, stays open for a
fire the app never reports, and THROWS synchronously on an id no
settlement can exist for.

The field report is the reason it exists: a relay holding only the port
could not learn the final truth, so it rebuilt one by hand out of a
listener and a stopwatch.

OPTIONAL here and REQUIRED on [SkillToolsPortWithSettlement](/api/index/interfaces/SkillToolsPortWithSettlement), which is
what [skillsAsTools](/api/index/functions/skillsAsTools) hands back — so a caller holding a built port
never meets the optionality, and nobody has to check for a member the
library always provides. The split is not decoration: this interface is
PUBLISHED, and an object literal written against an earlier release — a test
double, a hand-rolled relay facade — is a shape that must keep compiling. A
required member added underneath one would have broken every one of them,
which is a strange way to ship a door nobody had yet.

#### Parameters

##### transitionId

`string`

#### Returns

`Promise`\<[`FireSettlement`](/api/index/interfaces/FireSettlement)\>

#### Overrides

[`SkillToolsPort`](/api/index/interfaces/SkillToolsPort).[`whenSettled`](/api/index/interfaces/SkillToolsPort#whensettled)
