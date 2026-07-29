---
title: SkillToolsPortWithSettlement
---

# Interface: SkillToolsPortWithSettlement

Defined in: [src/serve/modes.ts:104](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L104)

What [skillsAsTools](/api/index/functions/skillsAsTools) returns: a port whose settlement door is always
there. Name the type only if you are storing the port somewhere typed — the
factory's inferred return already has it.

## Extends

- [`SkillToolsPort`](/api/index/interfaces/SkillToolsPort)

## Methods

### call()

> **call**(`name`, `args?`): [`ServeResult`](/api/index/type-aliases/ServeResult)

Defined in: [src/serve/modes.ts:73](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L73)

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

### tools()

> **tools**(): `MCPToolDescription`[]

Defined in: [src/serve/modes.ts:71](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L71)

The STATIC tool array — identical bytes for the life of the conversation.

#### Returns

`MCPToolDescription`[]

#### Inherited from

[`SkillToolsPort`](/api/index/interfaces/SkillToolsPort).[`tools`](/api/index/interfaces/SkillToolsPort#tools)

***

### whenSettled()

> **whenSettled**(`transitionId`): `Promise`\<[`FireSettlement`](/api/index/interfaces/FireSettlement)\>

Defined in: [src/serve/modes.ts:105](https://github.com/footprintjs/hcifootprint/blob/main/src/serve/modes.ts#L105)

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
