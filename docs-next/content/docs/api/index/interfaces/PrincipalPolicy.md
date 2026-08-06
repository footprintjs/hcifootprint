---
title: PrincipalPolicy
---

# Interface: PrincipalPolicy

Defined in: [src/atom/types.ts:710](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L710)

WHO MAY PERFORM THIS ACTION, WHOSE CHOICE IT IS, AND WHETHER A RECORDED YES IS
NEEDED — three separate facts that this library refuses to fold into one word.

`humanDecides` stays what it is: disclosure, never enforcement, the app's
statement that a CHOICE belongs to a person. This is the enforceable
neighbour, and it exists because disclosure alone has a measured ceiling — in
20 of 33 residual-harm rows of a preregistered campaign the decisive warning
was on the exact control at the exact turn and the model fired anyway.

NOTHING HERE ENFORCES BY ITSELF. Declaring it changes not one byte of what a
session does; [SessionOptions.enforcePrincipalPolicy](/api/index/interfaces/SessionOptions#enforceprincipalpolicy) is the switch, and
an integrator owns it.

```ts
'transfer-funds': {
  does: 'Transfer the balance',
  confirm: true,
  principalPolicy: {
    mayInvoke: ['human'],          // the agent may never perform it
    decisionOwner: 'human',        // …and the choice is theirs too (disclosure)
    requiresHumanApproval: true,   // …and a recorded yes is required when it is performed
  },
}
```

## Properties

### decisionOwner?

> `optional` **decisionOwner?**: `"agent"` \| `"human"` \| `"either"`

Defined in: [src/atom/types.ts:730](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L730)

DECISION OWNERSHIP — whose call the choice is. DISCLOSURE, and enforcement
never reads it: an owner is not a permission, and making "this is the
customer's choice" silently mean "the agent is forbidden" would be a refusal
nobody wrote. An app that wants ownership enforced says `mayInvoke: ['human']`
and means it.

`'either'` is a real answer, not a shrug: the app looked and says both may.

***

### mayInvoke?

> `optional` **mayInvoke?**: [`ActorKind`](/api/index/type-aliases/ActorKind)[]

Defined in: [src/atom/types.ts:720](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L720)

ACTOR IDENTITY — the kinds that may invoke this action. The ONE half
enforcement gates: a fire from any other principal is refused
`PRINCIPAL_NOT_ALLOWED`, naming the kinds required.

Omitted means the app said nothing, never "everyone" as a decision — the
refusal only exists where a list does. `[]` is refused at authoring: an
action nobody may ever perform is an action not to declare.

***

### requiresHumanApproval?

> `optional` **requiresHumanApproval?**: `boolean`

Defined in: [src/atom/types.ts:737](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L737)

CONSENT STATUS — this action needs a recorded human approval, whether or not
it is marked `confirm`. Under enforcement it is held to the SAME gate
[SessionOptions.requireHumanApproval](/api/index/interfaces/SessionOptions#requirehumanapproval) applies to high-effect actions,
and it mints NO new refusal word: the `APPROVAL_*` set is unchanged.
