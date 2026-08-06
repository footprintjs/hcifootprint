---
title: EffectPolicy
---

# Interface: EffectPolicy

Defined in: [src/atom/types.ts:303](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L303)

WHAT A HIGH-EFFECT ACTION MUST BE ABLE TO PROVE before this session will run
it. Opt-in, absent by default, and it refuses nothing else.

With `highEffectRequiresVerify: true`, a high-effect fire is refused
(`EFFECT_NOT_VERIFIABLE`) unless the action declared an
[Observability](/api/index/type-aliases/Observability) that is actually checkable: a postcondition, a declared
navigation, or an external observation the app promises to report. The two it
refuses are `'state-delta'` (key presence is not value correctness) and
`'unobservable'` (the app said nobody can tell), and an action that declared
nothing at all is refused with `needs: 'observability'` — say how, or do not
mark it high-effect.

## Properties

### highEffectRequiresVerify?

> `optional` **highEffectRequiresVerify?**: `boolean`

Defined in: [src/atom/types.ts:304](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L304)
