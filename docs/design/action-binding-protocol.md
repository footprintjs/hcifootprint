# Action Binding Protocol

Status: implemented on `feat/action-binding-protocol`.

Implemented in this branch: callable definitions, structured refs, the
many-binding registry, framework-neutral connection/host lifecycles, split
invocation and effect settlement, exact sensor ownership, contract activation
checking, a React adapter, and a dependency-free, test-only Angular lifecycle
proof.
Binding-specific expansion through the legacy Session/MCP serving surfaces is a
separate compatibility phase. Their existing graph, string-id, and serving
behavior remains a distinct API; the rules below describe only callable Action
Bindings.

## North-star promise

Developers declare an application action once. HCIFootprint binds that
definition to each live control. A broker reads and invokes offers only through
an explicit principal-scoped port, the runtime records the exact offer and
invocation, and verified effect evidence is accepted only when the definition
authored an evidence-bearing settlement contract and the exact binding was
classified as verifiable.

This protocol sits beside the existing graph, Session, registry, sensor, and
framework skins. It is not a replacement graph and it does not introduce a
selector table beside the binding record.

## Identities

Four identities remain separate because they answer four different questions.

| Identity | Question | Cardinality |
| --- | --- | --- |
| `ActionDefinitionRef` | What capability is this? | one definition |
| `ActionBindingRef` | Where, and for which live instance, is it connected? | many per definition |
| `ActionOfferRef` | Under which application facts was this binding exposed? | many per binding |
| `ActionTransitionRef` | Which particular invocation occurred? | many per binding |

String fields such as `definitionId`, `offerId`, and `transitionId` are display
and serialization projections only. Every Action Runtime lookup accepts the
structured reference that owns the string; there is no string lookup door and
no identity recovery by slicing or concatenating.

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

The v2 declaration is exactly
`defineAction(id, { does, invocation, inputSchema?, guard?, settle?, principal?, needs?, produces?, role?, mutate })`.
This grouped contract deliberately replaces the earlier 1.x callable-binding
surface and belongs to the next npm major; removed draft names are not retained
as compatibility aliases. The independent graph/Session API is unchanged.
Meaning and behavior live in the same authored record, while runtime reachability
still belongs to live bindings:

```ts
const archiveOrder = defineAction('orders.archive', {
  does: 'Archive this order',
  invocation: 'scalar',
  inputSchema: orderIdSchema,
  guard: {
    when: { page: { eq: 'orders' } },
    enabledWhen: { selection: { eq: 'one' } },
    blockedBecause: {
      says: 'Select exactly one order.',
      clearedBy: 'user',
    },
  },
  settle: {
    writes: ['orders.archived'],
    reads: ['orders.selection'],
    verify: archiveEvidence,
    progress: {
      stages: ['requesting', 'persisted'],
      required: true,
    },
  },
  principal: {
    mayInvoke: ['human', 'agent'],
    decisionOwner: 'either',
  },
  needs: { subject: { kind: 'order', from: 'selection' } },
  produces: { kind: 'archive-receipt' },
  role: 'action',
  mutate: async (orderId: string, lifecycle) => {
    lifecycle?.reportProgress('requesting');
    const receipt = await api.archive(orderId);
    lifecycle?.reportProgress('persisted', { receiptId: receipt.id });
    return receipt;
  },
});
```

`guard`, `settle`, and `principal` are phase-owned groups rather than flat
aliases. A guard describes pre-invocation availability, settlement describes
post-invocation evidence and progress, and principal describes authority and
decision ownership. `mutate` is required and remains the exact ordinary
callable. It is deliberately not copied into the frozen branded contract.

Calling the returned definition directly has the same arguments, `this`,
return value, thrown value, and thenable behavior as calling `mutate`.
`Function.prototype.bind`, `call`, and `apply` remain untouched; the protocol
adds no methods with those names. When `settle.progress` is declared, the
runtime may supply the optional final `ActionLifecycle` parameter on managed
invocation; an ordinary direct JavaScript call receives no lifecycle unless the
caller deliberately supplies one.

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

The framework-neutral runtime can enforce a self-validating or adapter-backed
`inputSchema`, and it always enforces `principal.mayInvoke`. It has no
application-state or authoritative-evidence port with which to evaluate
`guard.when`, `guard.enabledWhen`, or `settle.verify`; strict activation rejects
those clauses, while disclosure mode carries them without pretending they ran.
It likewise cannot enforce `principal.requiresHumanApproval` in strict mode.
`principal.decisionOwner`, `guard.blockedBecause`, settlement declarations
other than `verify`, and `needs`/`produces` are disclosure. These limits are a
runtime truth, not a limitation on what another integration may activate.

The brand owns a frozen authored record and the structured definition
reference. Plain declaration containers, including a plain `inputSchema`, are
detached and frozen. Functions and opaque validator capabilities retain
application identity/state and are explicitly a trust boundary rather than
immutable data. The inert channel `schema` slots likewise remain opaque for the
future layer that will interpret them.
A second copy of the package can recognize the record through the global
symbol registry without treating unbranded functions or malformed mutable
lookalikes as definitions. The brand is a cross-copy capability marker, not a
cryptographic forge-resistance boundary; frozen records are still validated
before recognition.

The symbol is `hcifootprint.action-definition.v2`. Its suffix versions the
in-process branded-record shape, not the npm major. This callable Action
Binding shape names the definition-side field `inputSchema`; navigation
`ActionDef.input` remains a separate graph declaration spelling.

### Invariant: JavaScript behavior is preserved

Failure examples include an arrow wrapper that loses `this`, an `async` wrapper
that assimilates or changes a thenable, or a custom `.bind()` method that
collides with JavaScript. Regression tests exercise direct call, `call`, `apply`,
native `bind`, sync throws, promises, and non-Promise thenables.

## Framework-independent connection lifecycle

`connectAction(runtime, definition, options)` establishes one binding. The core
lifecycle is:

```text
connect -> attach/update/touch -> forPrincipal(principal).offers
        -> principalPort.invoke -> settle -> disconnect
```

- `connect` allocates the binding identity and stores authored/runtime facts.
- `attach` resolves the actual interactive host through an adapter.
- `update` replaces committed runtime readers and state without replacing the
  binding identity. An equal patch is inert. `touch` explicitly publishes a
  new fact generation for stable readers whose meaning changed, and executes
  none of them. Input-reader presence is stable for the connection's type
  state; reconnect to add or remove that capability.
- `principalPort.offers()` mints self-describing offers for one explicit
  reader principal. It captures a bound input once,
  marks an inputless offer `none`, or marks a schema-declared unbound scalar
  `open`. Host-only and unschematized open actions are withheld.
- `principalPort.invoke(offer, input?)` resolves an offer minted for that same
  principal and creates a transition. These two methods are the only broker
  capabilities. `connection.invoke` remains the direct application/test door
  and never accepts an offer.
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

### Invariant: verification requires authored evidence and live coverage

`verified` has two independent gates. The definition must author at least one
evidence-bearing settlement clause: nonempty `settle.writes`, `settle.goTo`,
`settle.verify`, or `settle.observability` other than `unobservable`. The exact
invocation must also run from `verifiable` coverage. `settle.reads` names
dependencies and `settle.progress` records execution; neither can prove the
effect. Missing either gate rejects the verified verdict without consuming the
transition's effect terminal.

### Invariant: progress closes honestly

`settle.progress.stages` declares the transition's ordered vocabulary. A
managed handler reports only through its transition-owned
`lifecycle.reportProgress(stage, detail?)` capability. The invocation exposes a
live `progress` projection:

- while the handler is running: `{ disposition: 'open', declared, observed }`;
- if preflight refused it and the handler never started:
  `{ disposition: 'not-started', declared, observed: [] }`;
- when it returns, throws, or rejects:
  `{ disposition: 'closed', declared, observed, unreported }`.

`unreported` is exactly the declared stages for which no observation was
retained. Repeated observations remain in `observed` but do not change that set
difference. If `required: true` and a started invocation reports no stage, the
closed snapshot also carries `integrity: 'unmet'`. This is a silent
instrumentation finding: an unknown stage or failed reporting sink is routed to
`onInvocationError`, and progress integrity never replaces the application's
return value, thrown value, or invocation status.

### Invariant: abandonment requires authority

An unresolved effect may become `abandoned` only through an explicit authority:
`{ kind: 'cancelled', reason }`, `{ kind: 'deadline', deadlineAt }`, or
`{ kind: 'evidence-exhausted', sources }`. A host detach, framework unmount, or
binding disconnect is not abandonment; successful behavior often causes those
events, and an in-flight transition deliberately survives them so late evidence
can still settle it.

Effect settlement is first-terminal-wins. Once `verified`, `refused`, or
`abandoned` is retained, later evidence returns the existing terminal record
and cannot rewrite history.

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
- Every `verified` effect settlement requires both an authored evidence-bearing
  settlement contract and `verifiable` live coverage.

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

The pure `checkActionContracts` projection diagnoses the activation checks its
environment model can substantiate: `guard.when` and `guard.enabledWhen`
availability keys, declarative `settle.verify` keys, the runtime posture for a
function-valued `settle.verify`, principal gates, requested binding coverage,
high-effect verification paths, and required interactive hosts. It does not
turn diagnostics into enforcement and it does not own an approval workflow.
`report.ok` means every check the projection emitted is active or intentionally
disclosure-only; it is not a claim about clauses outside this environment
model. In particular, `inputSchema` activation belongs to `ActionRuntime`,
which owns its validator/adapter boundary, and is deliberately not certified by
`checkActionContracts`.

The new high-level connection API must activate an enforceable contract or fail
visibly. Existing low-level session defaults remain compatible and are reported
as disclosure/inert rather than silently reinterpreted.

The framework-neutral runtime therefore defaults to
`contractActivation: 'require-active'`. It directly enforces schemas carrying a
synchronous `.safeParse`/`.parse` validator. A plain JSON Schema (or another
format without its own checker) becomes active only through the runtime's
synchronous `inputSchemaAdapter`; the adapter gates execution but never replaces
the exact application payload with a parser transformation. Strict activation
rejects `guard.when`, `guard.enabledWhen`, `settle.verify`,
`principal.requiresHumanApproval`, and an unsupported `inputSchema`: this
runtime has no application-state, evidence, or approval port for those clauses.
It does not reject `principal.mayInvoke`; that policy is always enforced before
offer enumeration reads any live enabled, busy, or input reader, and is checked
again at invocation. `guard.blockedBecause` and
`principal.decisionOwner` remain descriptive. A caller may explicitly construct
`createActionRuntime({ contractActivation: 'disclosure' })` to carry
unsupported clauses as metadata. The runtime exposes that immutable choice through a
read-only accessor; it is never an invisible fallback and cannot be flipped by
plain JavaScript after construction.

## Offer generations and retained history

An offer carries the exact binding reference plus its committed-fact revision.
Repeated `principalPort.offers()` reads under unchanged facts reuse one frozen
offer for that principal.
Updates, `touch`, host replacement, attachment cleanup, and disconnect retire
it directly. `principalPort.offers()` and `principalPort.invoke(offer)` compare
the current facts to the minted generation and retire mismatches. Invocation
also requires the exact retained offer object, binding object, revision, and
principal; an old, cross-principal, cloned, or lookalike offer fails closed.
Direct `connection.invoke()` only gates on current facts and never consumes an
offer. Core enabled/busy readers are pull-based: an application that needs an
unobserved transient change to retire offers publishes it through `update`,
explicit `touch`, or attachment replacement. React makes this rule
scheduling-safe with `availabilityKey`; without a key it conservatively touches
after every committed render.

`principal.mayInvoke` is checked before offer enumeration evaluates the live
enabled, busy, input, or schema readers. A disallowed principal receives no
offer and cannot use policy probing to execute application readers. Invocation
rechecks the policy and requires authority for the same principal that received
the offer. Recreating a port for that principal does not change the authority;
a different principal cannot invoke it.

Input ownership is explicit per offer:

- `none` accepts no payload slot;
- `bound` executes the committed reader once while minting a new offer, retains
  that exact value privately, and carries an opaque `ActionInputRef`;
- `open` captures nothing until the caller supplies exactly one payload slot to
  `principalPort.invoke`; explicit `undefined` is a slot, omission is protocol
  misuse.

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
key change. This closes the exact stale-input race: replacing React's
`latest.current` reader from the `o-57` render with the `o-58` render without a
revision bump would let an offer minted against the old revision invoke through
the new reader. The commit now publishes a fresh revision and retires the old
offer before the `o-58` reader can be used. Adapter enabled/busy facts use the
separate `availabilityKey`. Neither key serializes, compares, or infers payload
or availability facts.

Full offers are retained in-process capabilities, not wire DTOs. A FE/BE
interaction broker retains the offer and sends only an opaque handle plus a
serializable UI projection. Returning the handle selects that exact retained
capability; cloning or reconstructing the offer is intentionally invalid.

Transitions deliberately outlive detach and disconnect so an in-flight
invocation can still receive authoritative effect evidence. Those lifecycle
events never imply `abandoned`. Once both invocation and effect rails are
settled, `forgetTransition(transitionRef)` is the explicit retention boundary.
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
The observer's invocation is discriminated by `behavior`: `mutation` carries
the definition implementation's output type, while `host-continuation` carries
the independent listener output type supplied by a framework adapter. Core
connections use `unknown` for that host result because core does not own it.

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
so agent-driven offers and host events reach the same settlement observer while
retaining their independent mutation and listener result types.
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
  `registerAction`, sensor declarations, and React hooks remain the legacy
  Session surface; this callable protocol does not silently reinterpret them.
- String ids remain readable fields for display and transport projections.
  Action Runtime lookups accept only `ActionDefinitionRef`,
  `ActionBindingRef`, or `ActionTransitionRef` as appropriate.
- React remains an optional peer and no framework enters the core dependency
  graph.
- Existing Session defaults do not become stricter.
- Agent-facing descriptions remain authored constants; runtime strings stay on
  the data channel.
- Bundle impact and subpath boundaries are measured separately.

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

## Decision: subpath doors at 3.0

Recorded 2026-08-26, spent later. The root barrel serves ~250 names — fine
today, a scale smell tomorrow. The remedy is subpath doors
(`hcifootprint/action`, `hcifootprint/kinds`, the way `/react` already
works), and moving exports is breaking — so it is a 3.0 decision to spend
ONCE, never nibbled at through deprecation drips.

Until then the fence is `test/barrel-surface.test.ts`: every addition to the
root surface is a deliberate edit that answers "why the root, and not a
subpath at 3.0?", and removals are refused outright — a removal IS the 3.0
move, and it does not happen by accident.
