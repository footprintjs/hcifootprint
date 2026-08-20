---
title: ActorKind
---

# Type Alias: ActorKind

> **ActorKind** = `"human"` \| `"agent"` \| `"system"`

Defined in: [src/atom/types.ts:686](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L686)

A KIND OF ACTOR a policy may name — deliberately NOT [Principal](/api/index/type-aliases/Principal).

A record files an act: `'user'` is how a person's fire is FILED. A policy
names who may act: `'human'` is the actor. Two questions, two vocabularies,
one bridge (`actorKindOf`, traverse/principal-policy.ts) — and writing
`mayInvoke: ['user']` is refused LOUDLY at the authoring door rather than
silently locking a person out of their own control.

`'unknown'` is not a kind, because you cannot grant a permission to nobody. A
fire whose principal this library never learned is refused by any declared
list, which is the fail-closed direction.
