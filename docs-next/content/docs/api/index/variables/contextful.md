---
title: contextful
---

# Variable: contextful

> `const` **contextful**: \<`A`, `R`\>(`fn`, `options`) => (...`args`) => `R` & `object`

Defined in: [src/contextful/contextful.ts:129](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/contextful.ts#L129)

Wrap a handler so both doors into one action — the agent's `fire()` and the
app's own call — land in the same capture envelope. See the module header.

## Type Declaration

### sense

> **sense**: (`anchor`, `options`) => [`SenseDeclaration`](/api/index/interfaces/SenseDeclaration)

SENSE-ONLY — the rung below a registered handler.

An app with no handler to wrap (the L0 shape: the button does its own thing
and nothing is bound) still has an anchor, and an anchor is enough to see that
a person acted. A TRUSTED click inside it opens a record-only fire stamped
`cause.inferred`, with the correlation rule on the record. The library
performs nothing here — it writes down what it saw, and says how it knows.

```ts
const release = session.sense('catalog.add-to-cart', contextful.sense(() => buttonRef.current));
```

#### Parameters

##### anchor

[`AnchorSource`](/api/index/type-aliases/AnchorSource)

##### options?

[`ContextfulOptions`](/api/index/interfaces/ContextfulOptions) = `{}`

#### Returns

[`SenseDeclaration`](/api/index/interfaces/SenseDeclaration)
