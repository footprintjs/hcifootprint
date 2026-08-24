---
title: BindingRegistrationOptions
---

# Interface: BindingRegistrationOptions

Defined in: [src/registry/registry.ts:73](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L73)

## Extended by

- [`BindingRegistrationUpdate`](/api/index/interfaces/BindingRegistrationUpdate)

## Properties

### attached?

> `optional` **attached?**: `boolean`

Defined in: [src/registry/registry.ts:75](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L75)

***

### coverage?

> `optional` **coverage?**: [`BindingCoverage`](/api/index/type-aliases/BindingCoverage)

Defined in: [src/registry/registry.ts:74](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L74)

***

### humanReporting?

> `optional` **humanReporting?**: [`HumanReporting`](/api/index/type-aliases/HumanReporting)

Defined in: [src/registry/registry.ts:77](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L77)

***

### input?

> `optional` **input?**: () => `unknown`

Defined in: [src/registry/registry.ts:78](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L78)

#### Returns

`unknown`

***

### locators?

> `optional` **locators?**: readonly [`Binding`](/api/index/type-aliases/Binding)[]

Defined in: [src/registry/registry.ts:76](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L76)

***

### readBusy?

> `optional` **readBusy?**: () => `string` \| `undefined`

Defined in: [src/registry/registry.ts:80](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L80)

#### Returns

`string` \| `undefined`

***

### readEnabled?

> `optional` **readEnabled?**: () => `boolean` \| `undefined`

Defined in: [src/registry/registry.ts:79](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L79)

#### Returns

`boolean` \| `undefined`
