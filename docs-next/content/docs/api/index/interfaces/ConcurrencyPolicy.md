---
title: ConcurrencyPolicy
---

# Interface: ConcurrencyPolicy

Defined in: [src/atom/types.ts:448](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L448)

ONE OCCURRENCE AT A TIME, OR AS MANY AS THE CALLER MAKES — the declaration
behind the `PRIOR_FIRE_PENDING` refusal.

`'parallel'` is the default and is what every release before this one did:
fire twice, get two occurrences. `'single-flight'` refuses a fire while a
prior occurrence in the same scope is UNRESOLVED — and unresolved means
exactly one thing: this session is still holding that fire's settlement
question open. It clears on real settlement and on nothing else. No timeout
expires it (a clock is not evidence), no read clears it, and the caller saying
the first one is finished is not the first one finishing.

```ts
'pay-invoice': {
  does: 'Pay the invoice', confirm: true, writes: ['invoice.paid'],
  concurrency: { mode: 'single-flight', scope: 'payload' },
}
```

## Properties

### mode

> **mode**: `"parallel"` \| `"single-flight"`

Defined in: [src/atom/types.ts:449](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L449)

***

### scope?

> `optional` **scope?**: `"action"` \| `"instance"` \| `"payload"`

Defined in: [src/atom/types.ts:463](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L463)

WHAT COUNTS AS "THE SAME FIRE AGAIN". Default `'action'`.

- `'action'` — one occurrence of this control at a time, whatever it carries.
- `'instance'` — one per repeats-container card (`FireOptions.instance`), so
  cancelling order #57 does not block cancelling #58.
- `'payload'` — one per identical input, compared over the same canonical
  rendering the approval gate uses. A payload this library cannot render
  faithfully (a Map, a Date, a cycle, anything past the caps) is treated as
  THE SAME as the pending one and refused: on a repeat-suppression boundary
  an unprovable difference is not a difference — the same stance
  `traverse/same-input.ts` takes, for the same reason.
