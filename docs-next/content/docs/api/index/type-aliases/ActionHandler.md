---
title: ActionHandler
---

# Type Alias: ActionHandler

> **ActionHandler** = (`payload?`) => `unknown` \| `Promise`\<`unknown`\>

Defined in: [src/registry/registry.ts:21](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L21)

ActionRegistry — the LIVE-BINDING layer (D13: declare statically, bind dynamically).

The declared graph is the map; this registry is what's actually wired right
now: affordanceId → the app's real handler function, registered in GROUPS
(one per component/section) so unmount cleanup is a single call.

Deliberately knows nothing about sessions, guards, or footprint — a plain
data structure so this layer tests in isolation.

Semantics:
- Last registration wins per affordance (React StrictMode double-mounts;
  a dev warning fires so real duplicates are visible).
- unregisterGroup(g) removes only registrations whose CURRENT owner is g —
  if group B re-registered an id after group A, A's unmount cannot tear
  down B's live binding.
- Registration carries NO planner-facing strings (descriptions/guards live
  in the declared spec — the prompt-injection firewall).

## Parameters

### payload?

`unknown`

## Returns

`unknown` \| `Promise`\<`unknown`\>
