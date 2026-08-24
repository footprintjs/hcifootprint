---
title: ActionInvocationMiddleware<This, Args, Result>
---

# Type Alias: ActionInvocationMiddleware\<This, Args, Result\>

> **ActionInvocationMiddleware**\<`This`, `Args`, `Result`\> = (`this`, `proceed`, ...`args`) => `Result`

Defined in: src/action/host-adapter.ts:280

One invocation door around an existing listener.

The middleware calls `proceed()` to execute the existing application
listener. Returning or rethrowing that result preserves the listener's exact
observable behavior while allowing the binding runtime to open its
transition first.

## Type Parameters

### This

`This`

### Args

`Args` *extends* readonly `unknown`[]

### Result

`Result`

## Parameters

### this

`This`

### proceed

() => `Result`

### args

...`Args`

## Returns

`Result`
