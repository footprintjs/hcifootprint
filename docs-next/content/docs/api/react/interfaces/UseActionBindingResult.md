---
title: UseActionBindingResult<Host, ComposedProps, Id>
---

# Interface: UseActionBindingResult\<Host, ComposedProps, Id\>

Defined in: [src/react/use-action-binding.ts:97](https://github.com/footprintjs/hcifootprint/blob/main/src/react/use-action-binding.ts#L97)

Render output plus a read-only accessor for the currently committed identity.

## Type Parameters

### Host

`Host`

### ComposedProps

`ComposedProps`

### Id

`Id` *extends* `string` = `string`

## Properties

### getBinding

> `readonly` **getBinding**: () => [`ActionBindingRef`](/api/index/interfaces/ActionBindingRef)\<`Id`\> \| `undefined`

Defined in: [src/react/use-action-binding.ts:108](https://github.com/footprintjs/hcifootprint/blob/main/src/react/use-action-binding.ts#L108)

The last committed identity. Undefined before the first host commit, on
SSR, after teardown, or when resolution is an honest failure.

#### Returns

[`ActionBindingRef`](/api/index/interfaces/ActionBindingRef)\<`Id`\> \| `undefined`

***

### hostProps

> `readonly` **hostProps**: `ComposedProps`

Defined in: [src/react/use-action-binding.ts:103](https://github.com/footprintjs/hcifootprint/blob/main/src/react/use-action-binding.ts#L103)

***

### ref

> `readonly` **ref**: [`ActionBindingRefCallback`](/api/react/type-aliases/ActionBindingRefCallback)\<`Host`\>

Defined in: [src/react/use-action-binding.ts:102](https://github.com/footprintjs/hcifootprint/blob/main/src/react/use-action-binding.ts#L102)
