---
title: SkillToolsPort
---

# Interface: SkillToolsPort

Defined in: [src/serve/modes.ts:85](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L85)

## Extended by

- [`SkillToolsPortWithSettlement`](/api/index/interfaces/SkillToolsPortWithSettlement)

## Methods

### call()

> **call**(`name`, `args?`): [`ServeResult`](/api/index/type-aliases/ServeResult)

Defined in: [src/serve/modes.ts:89](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L89)

Route a tool_use by name. Unknown names return a structured error result.

#### Parameters

##### name

`string`

##### args?

`unknown`

#### Returns

[`ServeResult`](/api/index/type-aliases/ServeResult)

***

### tools()

> **tools**(): `MCPToolDescription`[]

Defined in: [src/serve/modes.ts:87](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L87)

The STATIC tool array — identical bytes for the life of the conversation.

#### Returns

`MCPToolDescription`[]

***

### whenSettled()?

> `optional` **whenSettled**(`transitionId`): `Promise`\<[`FireSettlement`](/api/index/interfaces/FireSettlement)\>

Defined in: [src/serve/modes.ts:112](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L112)

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
