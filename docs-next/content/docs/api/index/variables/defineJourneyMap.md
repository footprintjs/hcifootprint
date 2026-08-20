---
title: defineJourneyMap
---

# Variable: defineJourneyMap

> `const` **defineJourneyMap**: \<`Def`\>(`id`, `rawDef`) => [`NavigationGraph`](/api/index/interfaces/NavigationGraph)\<[`NodePathsOf`](/api/index/type-aliases/NodePathsOf)\<`Def`\>\> = `buildNavigationGraph`

Defined in: [src/tree/appmap.ts:459](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/appmap.ts#L459)

THE OFFICIAL VOCABULARY (1.10.0): you declare the JourneyMap; the session is the
Walker; the recording carries both.

`defineJourneyMap` is a PERMANENT thin alias of [buildNavigationGraph](/api/index/functions/buildNavigationGraph) —
the same function object (reference-equal), the same signature, the same typed
node paths, both names exported forever; neither is a rename of the other. Use
whichever reads better where you are standing: `defineJourneyMap('shop', {…})`
says what you are DOING, `buildNavigationGraph('shop', {…})` says what you GET.

There is deliberately NO `Walker` export. The walker is not a thing you
construct — it is the session itself (`map.createSession()` mounts a cursor on
the map; the session walks it), and it is moved by exactly three movers, each
of which lands on the record as a `Cause`:

  • **human**  — a real click, sensed and attributed (`principal: 'user'`;
                 `watchPage` records it with no report call in any onClick);
  • **agent**  — the four served verbs — `whats_here` / `why` / `do_action` /
                 `did_it_work` — through the MCP door (`principal: 'agent'`);
  • **guard**  — your DATA decides: an action's `when` / `enabledWhen` judged
                 against the state your store pushed, so a control is off and
                 off for a reason it can name (`blockedBecause`, `unblockedBy`).

A move nobody offered is still a move: the world's own (`Cause.kind:
'stimulus'` — back button, server push, session expiry) is recorded rather
than silently absorbed.

The same pattern sits at three altitudes across the family: footprintjs walks
STAGES, agentfootprint (`defineSkillMap`) walks SKILLS, and this walks SCREENS.

Compile a navigation graph. The `const` type parameter preserves the literal
node names, so the returned graph's session methods (registerActions,
setVisible, show) accept ONLY real node paths — a typo is a compile error.

## Type Parameters

### Def

`Def` *extends* [`NavigationGraphDef`](/api/index/interfaces/NavigationGraphDef)

## Parameters

### id

`string`

### rawDef

`Def`

## Returns

[`NavigationGraph`](/api/index/interfaces/NavigationGraph)\<[`NodePathsOf`](/api/index/type-aliases/NodePathsOf)\<`Def`\>\>
