# Action Binding Protocol

Status: implemented on `feat/action-binding-protocol`.

Implemented in this branch: callable definitions, structured refs, the
many-binding registry, framework-neutral connection/host lifecycles, split
invocation and effect settlement, exact sensor ownership, contract activation
checking, a React adapter, and a dependency-free, test-only Angular lifecycle
proof.
Binding-specific expansion through the legacy Session/MCP serving surfaces is a
separate compatibility phase; their existing string-shaped behavior is retained
unchanged here.

## North-star promise

Developers declare an application action once. HCIFootprint binds that
definition to each live control, exposes only executable bindings, makes the
runtime's contract-activation policy explicit, records the exact offer and
invocation, and accepts verified effect evidence only from a binding classified
as verifiable.

This is an additive protocol over the existing graph, session, registry,
sensor, and framework skins. It is not a replacement graph and it does not
introduce a selector table beside the binding record.

## Identities

Four identities remain separate because they answer four different questions.

| Identity | Question | Cardinality |
| --- | --- | --- |
| `ActionDefinitionRef` | What capability is this? | one definition |
| `ActionBindingRef` | Where, and for which live instance, is it connected? | many per definition |
| `ActionOfferRef` | Under which application facts was this binding exposed? | many per binding |
| `ActionTransitionRef` | Which particular invocation occurred? | many per binding |

Compatibility strings such as an affordance id, offer id, and transition id
remain public projections. Internal protocol joins carry the structured
reference that owns the string instead of recovering another identity by
slicing or concatenating it.

### Invariant: no recovered control identity

Given a binding or transition, its definition and binding are available through
typed fields. No consumer needs `split`, `slice`, `lastIndexOf`, or a suffix
convention to discover the control or instance.

Failure example: parsing `orders.archive[o-57]` to rediscover the action and
row. Regression test: instance values containing punctuation remain opaque and
round-trip unchanged.

### Invariant: definitions and bindings are one-to-many

One callable definition may have multiple simultaneous live bindings. Each
binding receives its own generated identity, lifecycle, enabled/busy state,
input reader, host, locator projection, and invocation.

Failure example: storing one mutable `currentBinding` on the callable action.
Regression test: connecting order 57 and order 60, disconnecting one, and
invoking the other cannot cross handlers, inputs, or cleanup.

## Callable action definitions

`defineAction(id, contract, implementation)` returns an ordinary callable
function carrying a non-enumerable `Symbol.for` brand. Calling it directly has
the same arguments, `this`, return value, thrown value, and thenable behavior as
calling the implementation. `Function.prototype.bind`, `call`, and `apply`
remain untouched; the protocol adds no methods with those names.

The brand owns immutable authored metadata and the structured definition
reference. A second copy of the package can recognize it through the global
symbol registry without treating unbranded functions or malformed mutable
lookalikes as definitions. The brand is a cross-copy capability marker, not a
cryptographic forge-resistance boundary; frozen records are still validated
before recognition.

### Invariant: JavaScript behavior is preserved

Failure examples include an arrow wrapper that loses `this`, an `async` wrapper
that assimilates or changes a thenable, or a custom `.bind()` method that
collides with JavaScript. Regression tests exercise direct call, `call`, `apply`,
native `bind`, sync throws, promises, and non-Promise thenables.

## Framework-independent connection lifecycle

`connectAction(runtime, definition, options)` establishes one binding. The core
lifecycle is:

```text
connect -> attach -> update -> invoke -> settle -> disconnect
```

- `connect` allocates the binding identity and stores authored/runtime facts.
- `attach` resolves the actual interactive host through an adapter.
- `update` replaces committed runtime readers and state without replacing the
  binding identity. Input-reader presence is stable for the connection's type
  state; reconnect to add or remove that capability.
- `invoke` runs the exact binding and creates a transition reference;
  `invokeOffered` does the same under one exact prior offer without using an
  `undefined` argument-slot sentinel.
- `settle` records authoritative effect evidence independently of invocation
  completion.
- `disconnect` is idempotent and releases every host/runtime resource owned by
  that binding.

Render is never a lifecycle step. Framework integrations connect, update, and
disconnect only from committed lifecycle hooks or ref callbacks.

### Invariant: invocation and effect are separate rails

An implementation returning or its Promise resolving proves only that the
invocation completed. It does not prove React committed, Angular rendered, the
router arrived, or authoritative application state changed.

Failure example: marking a payment verified because its handler Promise
resolved. Regression test: an invocation may be `performed` while its effect is
`unverified`; only an explicit authoritative observation may move the effect to
`verified` or `refused`.

## Binding coverage

Every live binding states the strongest evidence it substantiates:

```ts
type BindingCoverage =
  | 'identity'
  | 'semantic'
  | 'executable'
  | 'verifiable';
```

Coverage is ordered. `semantic` includes identity, `executable` includes
semantic, and `verifiable` includes executable plus an authoritative effect
path.

- Pointing and test identity require `identity`.
- A consumer may claim human attribution only when it also has an explicit
  provenance and certainty marker; binding identity alone is not attribution.
- Agent exposure requires `executable`.
- Every `verified` effect settlement requires `verifiable`.

An element resolver, `data-testid`, or declared role/name can establish
identity. It cannot become executable without an invocation door.

## Contract activation

Declarations that look enforceable receive an explicit disposition:

```text
active | disclosure-only | unresolved | inert
```

- `active`: the runtime has the required enforcement/evidence path.
- `disclosure-only`: the declaration is intentionally descriptive.
- `unresolved`: the runtime lacks evidence needed to decide.
- `inert`: the declaration looks enforceable but the selected runtime options
  guarantee it will not operate.

The pure `checkActionContracts` projection diagnoses, at minimum:

- principal policy declared while principal enforcement is disabled;
- `enabledWhen` or declarative `verify` keys with no state/evidence producer;
- instance-scoped concurrency with no instance-capable binding;
- identity-only bindings requested for agent execution;
- high-effect bindings with no usable verification path;
- host adapters that cannot resolve their required interactive element.

The new high-level connection API must activate an enforceable contract or fail
visibly. Existing low-level session defaults remain compatible and are reported
as disclosure/inert rather than silently reinterpreted.

The framework-neutral runtime therefore defaults to
`contractActivation: 'require-active'`. It rejects `when`, `enabledWhen`, input
schemas, verification declarations, confirmation, enforceable principal-policy
fields, enforcing freshness axes, and non-parallel concurrency because it has
no state, principal, approval, or policy port with which to enforce them.
Decision ownership and `'disclose'` freshness remain descriptive. A caller may explicitly construct
`createActionBindingRuntime({ contractActivation: 'disclosure' })` to carry
those clauses as metadata. The runtime exposes that immutable choice through a
read-only accessor; it is never an invisible fallback and cannot be flipped by
plain JavaScript after construction.

## Offer generations and retained history

An offer carries the exact binding reference plus its committed-fact revision.
Repeated availability reads under unchanged facts reuse one frozen offer.
Updates, host replacement, attachment cleanup, disconnect, and enabled/busy
changes observed by availability or direct invocation retire it. Invocation
checks the offer object, binding object, revision, and current facts; an old or
lookalike offer fails closed. Enabled/busy readers are pull-based: an application
that needs an unobserved transient change to retire offers must publish it
through `update` (or replace the attachment), rather than changing away and back
between reads.

Transitions deliberately outlive disconnect so an in-flight invocation can
still receive authoritative effect evidence. Once both invocation and effect
rails are settled, `forgetTransition(ref)` is the explicit retention boundary.
Plain-record/array evidence is detached and frozen before entering history;
opaque application objects retain their identity.

## Host adapters

A host adapter is executable code, not a component-name switch:

```ts
interface ActionHostAdapter<Props, Host, Interactive extends object> {
  // Render-time: pure, before a host exists.
  composeInvocation(props: Readonly<Props>, invoke: unknown): Readonly<Props>;

  // Commit-time: wrapper, interactive target, and value owner stay distinct.
  resolve(props: Readonly<Props>, host: Host):
    | { kind: 'resolved'; interactive: Interactive; valueElement?: object }
    | { kind: 'unresolved'; reason: 'absent' | 'ambiguous' | 'unsupported' };

  readEnabled?(context: ActionHostContext<Props, Host, Interactive>):
    | boolean
    | undefined;
  readBusy?(context: ActionHostContext<Props, Host, Interactive>):
    | string
    | undefined;
  readCoverage?(context: ActionHostContext<Props, Host, Interactive>):
    | BindingCoverage
    | undefined;
  projectLocators?(context: ActionHostContext<Props, Host, Interactive>):
    | readonly Binding[]
    | undefined;
}
```

`composeActionInvocation` owns the existing listener continuation: repeated
`proceed()` calls return the same value or rethrow the same error, never execute
the listener again. `connection.invokeContinuation()` opens the transition
around that continuation without also calling the definition implementation.
The adapter resolves wrappers to the real interactive descendant and projects
only explicit facts onto the binding record. Pointing, tests, the sensor, agent
exposure, and developer tooling read that same record; there is no second
selector registry.

### Human reporting ownership

A binding-aware page watcher accepts an ephemeral element-to-binding ownership
projection. Sensor capture stands down for that exact interactive element while
the connection-owned listener records the binding occurrence. Another
sensor-owned element for the same definition continues to report; this is
deliberately not the static, edge-wide `reportedElsewhere` switch. Attachments
are token-owned so stale framework cleanup cannot reopen a superseded element.

This phase does not mint a human principal, attribution basis, or certainty from
the connection occurrence. The legacy sensor/session path remains the source of
those provenance fields. An integration that projects connection ownership must
not describe the resulting binding transition as human-attributed until it adds
an explicit provenance rail.

## Framework requirements

### React

The React skin is generation-owned, registers only from committed callback refs,
keeps render-time props behind a commit barrier, survives StrictMode cleanup,
preserves stale-listener behavior without successor attribution, and releases a
binding during an async invocation without changing that invocation's result.
The physical-root projector and no-host renderer prove the portal/SSR seams
structurally. A real `react-dom` portal plus server hydration fixture is deferred
rather than claimed by this change.

### Angular proof

The Angular proof is a test-only structural directive fixture over the same
framework-independent connection lifecycle. It models `DestroyRef` cleanup,
committed input updates, host-versus-descendant resolution, and
zone-full/zone-less invocation without shipping an Angular adapter. The core
does not import Angular or make it a required peer.

## Compatibility boundaries

- Existing graph declarations, `registerHandlers`, `registerActions`,
  `registerAction`, sensor declarations, and React hooks remain available.
- Existing string ids remain valid public projections.
- React remains an optional peer and no framework enters the core dependency
  graph.
- New exports are additive. Existing session defaults do not become stricter.
- Agent-facing descriptions remain authored constants; runtime strings stay on
  the data channel.
- Bundle impact and subpath boundaries are measured before release.

## Proof standard

For each defect or invariant:

1. Add a failing test.
2. Name the violated invariant.
3. Implement the smallest correction.
4. Temporarily neutralize the correction and confirm the test turns red.
5. Restore it.
6. Run targeted tests and type-checking.
7. Run the complete suite.
8. Review public types, generated docs, and package boundaries.

Green tests prove only what their assertions distinguish. Tests in this change
must distinguish structured identity from string reconstruction, exact binding
invocation from definition-level dispatch, invocation completion from effect
verification, and an active contract from a declaration that merely exists.
