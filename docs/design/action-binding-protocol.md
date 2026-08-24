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

Generated ids are unique only inside one runtime generation. Exact in-process
joins use frozen reference identity; durable logs or a network broker must add
their own runtime/session generation instead of treating `transition#1` as a
global id.

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

The callable definition names its payload declaration `inputSchema`. Live
connections and framework bindings name their live value reader `input`.
Direct connection invocation reads that reader at invocation time; offer
minting reads and retains it once for the bound offer generation. Keeping those
names distinct prevents a schema from being mistaken for a current value
source. The legacy navigation-graph `ActionDef.input` spelling
remains unchanged; this distinction belongs only to the callable Action Binding
surface.

Every definition declares `invocation: 'inputless' | 'scalar' | 'host'`.
`inputless` and `scalar` are direct/broker shapes; scalar means exactly one
deliberate payload slot. `host` is available only through
`invokeContinuation()`, preserving receiver and multi-argument listener
semantics. This mode is frozen branded metadata. The runtime never infers it
from mutable and lossy `Function.length`.

`needs` and `produces` are accepted as inert, kind-based declarations for the
future Channels layer. Layer 1 validates and freezes them but performs no kind
matching, UI selection, input collection, output routing, or degradation.

The brand owns a frozen authored record and the structured definition
reference. Plain declaration containers, including JSON Schema, are detached
and frozen. Functions and opaque validator capabilities retain application
identity/state and are explicitly a trust boundary rather than immutable data.
A second copy of the package can recognize the record through the global
symbol registry without treating unbranded functions or malformed mutable
lookalikes as definitions. The brand is a cross-copy capability marker, not a
cryptographic forge-resistance boundary; frozen records are still validated
before recognition.

The symbol is `hcifootprint.action-definition.v1`. Its suffix versions the
in-process branded-record shape, not the npm major. This is the first public
callable Action Binding shape; it names the definition-side field
`inputSchema`. Navigation `ActionDef.input` remains a separate, compatible
graph declaration spelling.

### Invariant: JavaScript behavior is preserved

Failure examples include an arrow wrapper that loses `this`, an `async` wrapper
that assimilates or changes a thenable, or a custom `.bind()` method that
collides with JavaScript. Regression tests exercise direct call, `call`, `apply`,
native `bind`, sync throws, promises, and non-Promise thenables.

## Framework-independent connection lifecycle

`connectAction(runtime, definition, options)` establishes one binding. The core
lifecycle is:

```text
connect -> attach/update/touch -> available -> runtime.invoke -> settle -> disconnect
```

- `connect` allocates the binding identity and stores authored/runtime facts.
- `attach` resolves the actual interactive host through an adapter.
- `update` replaces committed runtime readers and state without replacing the
  binding identity. An equal patch is inert. `touch` explicitly publishes a
  new fact generation for stable readers whose meaning changed, and executes
  none of them. Input-reader presence is stable for the connection's type
  state; reconnect to add or remove that capability.
- `available` mints a self-describing offer. It captures a bound input once,
  marks an inputless offer `none`, or marks a schema-declared unbound scalar
  `open`. Host-only and unschematized open actions are withheld.
- `runtime.invoke(offer, input)` resolves the exact retained offer and creates
  a transition. It is the sole offered-invocation door. `connection.invoke`
  remains the direct application/test door and never accepts an offer.
- `settle` records authoritative effect evidence independently of invocation
  completion.
- `disconnect` is idempotent and releases every host/runtime resource owned by
  that binding.

Render is never a lifecycle step. Framework integrations connect, update, and
disconnect only from committed lifecycle hooks or ref callbacks.

### Invariant: invocation and effect are separate rails

An implementation returning or its Promise resolving proves only that the
invocation completed. `performed` means it returned/resolved; `failed` means it
started and threw/rejected; `refused` is reserved for a rejection before the
application handler started. None proves React committed, Angular rendered,
the router arrived, or authoritative application state changed.

Failure example: marking a payment verified because its handler Promise
resolved. Regression test: an invocation may be `performed` while its effect is
`unverified`; only an explicit authoritative observation may move the effect to
`verified` or `refused`. A preflight input refusal is the one exception: the
runtime authoritatively knows the handler never started, immediately refuses the
effect as not attempted, and permits collection of the fully terminal record.

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
`contractActivation: 'require-active'`. It directly enforces schemas carrying a
synchronous `.safeParse`/`.parse` validator. A plain JSON Schema (or another
format without its own checker) becomes active only through the runtime's
synchronous `inputSchemaAdapter`; the adapter gates execution but never replaces
the exact application payload with a parser transformation. The runtime still
rejects `when`, `enabledWhen`, verification declarations, confirmation,
enforceable principal-policy fields, enforcing freshness axes, and non-parallel
concurrency because it has no state, principal, approval, or policy port with
which to enforce them. Decision ownership and `'disclose'` freshness remain
descriptive. A caller may explicitly construct
`createActionBindingRuntime({ contractActivation: 'disclosure' })` to carry
those clauses as metadata. The runtime exposes that immutable choice through a
read-only accessor; it is never an invisible fallback and cannot be flipped by
plain JavaScript after construction.

## Offer generations and retained history

An offer carries the exact binding reference plus its committed-fact revision.
Repeated availability reads under unchanged facts reuse one frozen offer.
Updates, `touch`, host replacement, attachment cleanup, and disconnect retire
it directly. `available()` and `runtime.invoke(offer)` compare the current
enabled/busy facts to the minted generation and retire mismatches. Direct
`connection.invoke()` only gates on current enabledness and does not validate
an unrelated retained offer. Invocation through an offer checks the offer
object, binding object, revision, and current facts; an old or lookalike offer
fails closed. Core enabled/busy readers are pull-based: an application that
needs an unobserved transient change to retire offers publishes it through
`update`, explicit `touch`, or attachment replacement. React makes this rule
scheduling-safe with `availabilityKey`; without a key it conservatively touches
after every committed render.

Input ownership is explicit per offer:

- `none` accepts no payload slot;
- `bound` executes the committed reader once while minting a new offer, retains
  that exact value privately, and carries an opaque `ActionInputRef`;
- `open` captures nothing until the caller supplies exactly one payload slot to
  `runtime.invoke`; explicit `undefined` is a slot, omission is protocol misuse.

Repeated availability reads under one revision reuse the bound capture.
Invocation never rereads it and rejects every attempted replacement. A bound
transition reuses the offer's exact input ref; an open invocation creates a
caller-origin ref. Transition history records only this non-secret receipt, not
the payload value. For an opaque mutable payload the guarantee is reference
identity; applications needing value immutability must return an immutable
value from the reader.

A framework adapter whose reader closes over rendered props publishes a fresh
binding revision only after a relevant committed input generation. React makes
that generation explicit as `inputKey` and atomically replaces the reader on a
key change. Adapter enabled/busy facts use the separate `availabilityKey`. It
does not serialize, compare, or infer either payload or availability facts.

Full offers are retained in-process capabilities, not wire DTOs. A FE/BE
interaction broker retains the offer and sends only an opaque handle plus a
serializable UI projection. Returning the handle selects that exact retained
capability; cloning or reconstructing the offer is intentionally invalid.

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

Invocation observation belongs to the core connection, not only the framework
listener wrapper. A binding observer therefore receives direct, brokered, and
host-continuation invocations through the same narrow settlement capability;
observer failures are severed from application return/throw behavior.

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
keeps render-time props behind a commit barrier, requires `inputKey` with every
bound reader, survives StrictMode cleanup, preserves stale-listener behavior
without successor attribution, and releases a binding during an async
invocation without changing that invocation's result. Same-`inputKey` rerenders
reuse offers only with no availability readers or an unchanged explicit
`availabilityKey`; a changed key publishes exactly one committed generation. Adapter
enabled/busy readers use `availabilityKey`; without one, every commit
conservatively advances the generation. Input and availability changes in the
same commit advance it once. The core connection owns invocation observation,
so agent-driven offers and host events reach the same settlement observer.
Publication failure disconnects fail-closed.
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
