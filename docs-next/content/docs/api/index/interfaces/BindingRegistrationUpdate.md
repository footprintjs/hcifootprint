---
title: BindingRegistrationUpdate
---

# Interface: BindingRegistrationUpdate

Defined in: [src/registry/registry.ts:83](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L83)

## Extends

- [`BindingRegistrationOptions`](/api/index/interfaces/BindingRegistrationOptions)

## Properties

### attached?

> `optional` **attached?**: `boolean`

Defined in: [src/registry/registry.ts:75](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L75)

#### Inherited from

[`BindingRegistrationOptions`](/api/index/interfaces/BindingRegistrationOptions).[`attached`](/api/index/interfaces/BindingRegistrationOptions#attached)

***

### coverage?

> `optional` **coverage?**: [`BindingCoverage`](/api/index/type-aliases/BindingCoverage)

Defined in: [src/registry/registry.ts:74](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L74)

#### Inherited from

[`BindingRegistrationOptions`](/api/index/interfaces/BindingRegistrationOptions).[`coverage`](/api/index/interfaces/BindingRegistrationOptions#coverage)

***

### humanReporting?

> `optional` **humanReporting?**: [`HumanReporting`](/api/index/type-aliases/HumanReporting)

Defined in: [src/registry/registry.ts:77](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L77)

#### Inherited from

[`BindingRegistrationOptions`](/api/index/interfaces/BindingRegistrationOptions).[`humanReporting`](/api/index/interfaces/BindingRegistrationOptions#humanreporting)

***

### input?

> `optional` **input?**: () => `unknown`

Defined in: [src/registry/registry.ts:78](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L78)

#### Returns

`unknown`

#### Inherited from

[`BindingRegistrationOptions`](/api/index/interfaces/BindingRegistrationOptions).[`input`](/api/index/interfaces/BindingRegistrationOptions#input)

***

### locators?

> `optional` **locators?**: readonly [`Binding`](/api/index/type-aliases/Binding)[]

Defined in: [src/registry/registry.ts:76](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L76)

#### Inherited from

[`BindingRegistrationOptions`](/api/index/interfaces/BindingRegistrationOptions).[`locators`](/api/index/interfaces/BindingRegistrationOptions#locators)

***

### readBusy?

> `optional` **readBusy?**: () => `string` \| `undefined`

Defined in: [src/registry/registry.ts:80](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L80)

#### Returns

`string` \| `undefined`

#### Inherited from

[`BindingRegistrationOptions`](/api/index/interfaces/BindingRegistrationOptions).[`readBusy`](/api/index/interfaces/BindingRegistrationOptions#readbusy)

***

### readEnabled?

> `optional` **readEnabled?**: () => `boolean` \| `undefined`

Defined in: [src/registry/registry.ts:79](https://github.com/footprintjs/hcifootprint/blob/main/src/registry/registry.ts#L79)

#### Returns

`boolean` \| `undefined`

#### Inherited from

[`BindingRegistrationOptions`](/api/index/interfaces/BindingRegistrationOptions).[`readEnabled`](/api/index/interfaces/BindingRegistrationOptions#readenabled)
