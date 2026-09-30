/** Compile-time laws for the grouped v2 action declaration and scoped runtime. */
import {
  actionDefinitionOf,
  connectAction,
  createActionRuntime,
  defineAction,
  type ActionDef,
  type ActionBindingUpdate,
  type ActionDefinitionContract,
  type ActionGuardContract,
  type ActionHostAdapter,
  type ActionInvocation,
  type ActionInvocationMiddleware,
  type ActionLifecycle,
  type ConnectActionOptions,
  type ActionProgressDeclaration,
  type ActionRuntime,
  type ActionSettleContract,
  type ActionTransitionSnapshot,
  type BoundActionOffer,
  type InputlessActionOffer,
  type OpenActionOffer,
  type PrincipalActionPort,
} from '../src/index.js';
import { useActionBinding } from '../src/react/index.js';

const runtime: ActionRuntime = createActionRuntime();
const agentPort = runtime.forPrincipal('agent');
const _typedAgentPort: PrincipalActionPort<'agent'> = agentPort;
const _agentLiteral: 'agent' = agentPort.principal;

const scalar = defineAction('types.scalar', {
  does: 'Run a scalar action',
  invocation: 'scalar',
  mutate: (value: string) => value.length,
});
const ambiguousInputOptions: ConnectActionOptions<string> = {
  node: 'types',
  input: () => 'value',
};
// @ts-expect-error an optional input field cannot establish the connection's reader type-state
connectAction(runtime, scalar, ambiguousInputOptions);
const _scalarResult: number = scalar('value');
// @ts-expect-error scalar callables require exactly one application payload
scalar();
// @ts-expect-error scalar payload inference is retained
scalar(42);

const scalarConnection = connectAction(runtime, scalar, { node: 'types' });
const scalarInvocation = scalarConnection.invoke('value');
const _scalarBehavior: 'mutation' = scalarInvocation.behavior;
// @ts-expect-error direct invocation can never execute a host continuation
const _impossibleScalarBehavior: 'host-continuation' =
  scalarInvocation.behavior;
// @ts-expect-error a required payload cannot disappear without an input reader
scalarConnection.invoke();
// @ts-expect-error update cannot widen this connection's input-reader type-state
scalarConnection.update({ input: () => 'later' });
const ambiguousInputUpdate: ActionBindingUpdate<string> = {
  input: () => 'later',
};
// @ts-expect-error an optional input field cannot widen a no-reader connection
scalarConnection.update(ambiguousInputUpdate);
const scalarWithReader = connectAction(runtime, scalar, {
  node: 'types',
  input: () => 'committed',
});
scalarWithReader.invoke();
const reusablePatch: ActionBindingUpdate<string> = {
  enabled: () => true,
};
scalarWithReader.update(reusablePatch);
// @ts-expect-error an explicit undefined cannot masquerade as an omitted reader update
scalarWithReader.update({ input: undefined });
scalarWithReader.touch();
// @ts-expect-error a bound connection owns its payload and cannot be overridden
scalarWithReader.invoke('replacement');

const scalarOfferForAgent = agentPort.offers(scalar)[0]!;
const _agentOfferPrincipal: 'agent' = scalarOfferForAgent.ref.principal;
const scalarDefinitionRef = actionDefinitionOf(scalar)!.ref;
const _agentRefOfferPrincipal: 'agent' =
  agentPort.offers(scalarDefinitionRef)[0]!.ref.principal;
const _agentAnyOfferPrincipal: 'agent' = agentPort.offers()[0]!.ref.principal;
if (scalarOfferForAgent.inputMode === 'open') {
  const _openInvocation: ActionInvocation<number, 'types.scalar', 'mutation'> =
    agentPort.invoke(scalarOfferForAgent, 'value');
  // @ts-expect-error an open offer retains its scalar payload type
  agentPort.invoke(scalarOfferForAgent, 42);
} else {
  const _boundInvocation: ActionInvocation<number, 'types.scalar', 'mutation'> =
    agentPort.invoke(scalarOfferForAgent);
  // @ts-expect-error a bound offer accepts no replacement payload
  agentPort.invoke(scalarOfferForAgent, 'replacement');
}

declare const boundScalarOffer: BoundActionOffer<
  'types.scalar',
  typeof scalar,
  'agent'
>;
declare const openScalarOffer: OpenActionOffer<
  'types.scalar',
  typeof scalar,
  'agent'
>;
agentPort.invoke(boundScalarOffer);
agentPort.invoke(openScalarOffer, 'value');
// @ts-expect-error a bound offer accepts no replacement payload
agentPort.invoke(boundScalarOffer, 'replacement');
// @ts-expect-error an open action needs a caller payload
agentPort.invoke(openScalarOffer);

const zero = defineAction('types.zero', {
  does: 'Run without input',
  invocation: 'inputless',
  mutate: () => undefined,
});
zero();
// @ts-expect-error inputless callables have no explicit undefined form
zero(undefined);
// @ts-expect-error an inputless definition cannot acquire an input reader
connectAction(runtime, zero, { node: 'types', input: () => undefined });
const zeroConnection = connectAction(runtime, zero, { node: 'types' });
zeroConnection.invoke();
declare const inputlessOffer: InputlessActionOffer<
  'types.zero',
  typeof zero,
  'agent'
>;
agentPort.invoke(inputlessOffer);
// @ts-expect-error an inputless offer has no explicit undefined form
agentPort.invoke(inputlessOffer, undefined);

const many = defineAction('types.many', {
  does: 'Run a listener with several arguments',
  invocation: 'host',
  mutate: (left: string, right: number) => `${left}:${right}`,
});
const _hostResult: string = many('left', 1);
const manyConnection = connectAction(runtime, many, { node: 'types' });
// @ts-expect-error direct runtime invocation cannot discard host arguments
manyConnection.invoke('left');
const hostInvocation = manyConnection.invokeContinuation(() => many('left', 1));
const _hostBehavior: 'host-continuation' = hostInvocation.behavior;
const _hostProgress: undefined = hostInvocation.progress;
// @ts-expect-error a host continuation never reports mutation behavior
const _impossibleHostBehavior: 'mutation' = hostInvocation.behavior;
const _manyOffers: readonly never[] = agentPort.offers(many);

const userPort = runtime.forPrincipal('user');
const userOffer = userPort.offers(zero)[0]!;
const _userOfferPrincipal: 'user' = userOffer.ref.principal;
// @ts-expect-error principal-scoped ports reject capabilities minted for another principal
agentPort.invoke(userOffer);
declare const userBoundOffer: BoundActionOffer<
  'types.scalar',
  typeof scalar,
  'user'
>;
declare const userOpenOffer: OpenActionOffer<
  'types.scalar',
  typeof scalar,
  'user'
>;
declare const userInputlessOffer: InputlessActionOffer<
  'types.zero',
  typeof zero,
  'user'
>;
// @ts-expect-error a bound user capability cannot cross into agent authority
agentPort.invoke(userBoundOffer);
// @ts-expect-error an open user capability cannot cross into agent authority
agentPort.invoke(userOpenOffer, 'value');
// @ts-expect-error an inputless user capability cannot cross into agent authority
agentPort.invoke(userInputlessOffer);

const receiver = defineAction('types.receiver', {
  does: 'Run a receiver-sensitive listener',
  invocation: 'host',
  mutate(this: { prefix: string }, value: string) {
    return `${this.prefix}:${value}`;
  },
});
receiver.call({ prefix: 'safe' }, 'value');
const receiverConnection = connectAction(runtime, receiver, { node: 'types' });
receiverConnection.invokeContinuation(() =>
  receiver.call({ prefix: 'safe' }, 'value'),
);

const progressScalar = defineAction('types.progress-scalar', {
  does: 'Run a scalar action with declared progress',
  invocation: 'scalar',
  settle: { progress: { stages: ['started', 'stored'], required: true } },
  mutate: (value: string, lifecycle) => {
    lifecycle?.reportProgress('started');
    // @ts-expect-error progress reporting is restricted to the declared vocabulary
    lifecycle?.reportProgress('typo');
    return value.length;
  },
});
const _progressResult: number = progressScalar('value');
// @ts-expect-error lifecycle is a runtime-owned capability, not app input
progressScalar('value', undefined);

const progressInputless = defineAction('types.progress-inputless', {
  does: 'Run an inputless action with declared progress',
  invocation: 'inputless',
  settle: { progress: { stages: ['done'] } },
  mutate: (lifecycle) => {
    lifecycle?.reportProgress('done');
    // @ts-expect-error an unannotated lifecycle retains the declared stage literal
    lifecycle?.reportProgress('started');
    return true;
  },
});
const _progressInputlessResult: boolean = progressInputless();
// @ts-expect-error lifecycle is never exposed on the returned callable
progressInputless(undefined);

const _guardFragment: ActionGuardContract = {
  when: { ready: { eq: true } },
};
const _progressFragment: ActionProgressDeclaration<
  readonly ['queued', 'done']
> = {
  stages: ['queued', 'done'],
};
const _settleFragment: ActionSettleContract = {
  progress: _progressFragment,
};

defineAction('types.empty-guard', {
  does: 'Reject empty guard',
  // @ts-expect-error an empty guard matches no legal invocation overload
  invocation: 'inputless',
  // @ts-expect-error a present guard group must author at least one clause
  guard: {},
  mutate: () => undefined,
});

defineAction('types.empty-settle', {
  does: 'Reject empty settle',
  // @ts-expect-error an empty settle matches no legal invocation overload
  invocation: 'inputless',
  // @ts-expect-error a present settle group must author at least one clause
  settle: {},
  mutate: () => undefined,
});

defineAction('types.empty-principal', {
  does: 'Reject empty principal',
  // @ts-expect-error an empty principal matches no legal invocation overload
  invocation: 'inputless',
  // @ts-expect-error a present principal group must author at least one clause
  principal: {},
  mutate: () => undefined,
});

defineAction('types.optional-scalar', {
  does: 'Reject an optional scalar payload slot',
  // @ts-expect-error scalar payload omission is protocol misuse
  invocation: 'scalar',
  mutate: (_value?: string) => undefined,
});

defineAction('types.optional-progress-scalar', {
  does: 'Reject optional scalar progress',
  // @ts-expect-error an optional scalar slot matches no legal invocation overload
  invocation: 'scalar',
  // @ts-expect-error progress does not change scalar payload requiredness
  settle: { progress: { stages: ['started'] } },
  mutate: (_value?: string, lifecycle?: ActionLifecycle) =>
    lifecycle?.reportProgress('started'),
});

const scalarUndefined = defineAction('types.required-undefined-scalar', {
  does: 'Accept undefined only through a deliberate payload slot',
  invocation: 'scalar',
  mutate: (_value: string | undefined) => undefined,
});
scalarUndefined(undefined);
// @ts-expect-error a required undefined-capable slot still cannot be omitted
scalarUndefined();

const readonlyDefinition = defineAction('types.readonly', {
  does: 'Expose immutable grouped declaration metadata',
  invocation: 'inputless',
  guard: { when: { ready: { eq: true } } },
  settle: { writes: ['state.value'], progress: { stages: ['saved'] } },
  principal: { mayInvoke: ['human'] },
  mutate: (_lifecycle?: ActionLifecycle<'types.readonly'>) => undefined,
});
const contract = actionDefinitionOf(readonlyDefinition)!.contract;
// @ts-expect-error grouped declaration arrays are readonly through the brand
contract.settle?.writes?.push('state.attacker');
// @ts-expect-error progress stages are readonly too
contract.settle?.progress?.stages.push('attacker');
// @ts-expect-error nested principal policy arrays are readonly
contract.principal?.mayInvoke?.push('agent');
// @ts-expect-error mutate is deliberately absent from branded metadata
contract.mutate;

const inputSchema = {
  safeParse: (_value: unknown) => ({ success: true as const }),
};
const schemaDefined = defineAction('types.input-schema', {
  does: 'Use a declared input schema',
  invocation: 'scalar',
  inputSchema,
  mutate: (value: string) => value,
});
const schemaContract = actionDefinitionOf(schemaDefined)!.contract;
schemaContract.inputSchema;
// @ts-expect-error definitions separate schema from a live input reader
schemaContract.input;

// @ts-expect-error the public contract forbids schemas on inputless definitions
const _invalidInputlessContract: ActionDefinitionContract = {
  does: 'Contradict the inputless branch',
  invocation: 'inputless',
  inputSchema,
};

// @ts-expect-error the public contract forbids payload schemas on host definitions
const _invalidHostSchemaContract: ActionDefinitionContract = {
  does: 'Contradict the host branch',
  invocation: 'host',
  inputSchema,
};

// @ts-expect-error the public contract forbids lifecycle progress on host definitions
const _invalidHostProgressContract: ActionDefinitionContract = {
  does: 'Contradict the host lifecycle branch',
  invocation: 'host',
  settle: { progress: { stages: ['started'] } },
};

defineAction(
  'types.legacy-three-args',
  { does: 'Old contract', invocation: 'inputless' },
  // @ts-expect-error the old three-argument declaration surface is gone
  () => undefined,
);

defineAction('types.flat-guard', {
  does: 'Reject flat v1 fields',
  // @ts-expect-error guards live under guard
  invocation: 'inputless',
  when: { ready: { eq: true } },
  mutate: () => undefined,
});

defineAction('types.flat-settle', {
  does: 'Reject flat v1 settlement fields',
  // @ts-expect-error effect declarations live under settle
  invocation: 'inputless',
  writes: ['state.value'],
  mutate: () => undefined,
});

defineAction('types.flat-principal', {
  does: 'Reject the v1 principal field',
  // @ts-expect-error principal policy lives under principal
  invocation: 'inputless',
  principalPolicy: { mayInvoke: ['human'] },
  mutate: () => undefined,
});

defineAction(
  'types.missing-invocation',
  // @ts-expect-error every callable definition authors an invocation mode
  { does: 'Reject inferred invocation', mutate: () => undefined },
);

defineAction('types.inputless-with-slot', {
  does: 'Reject an inputless positional slot',
  // @ts-expect-error no progress declaration means no lifecycle slot
  invocation: 'inputless',
  mutate: (_value: string) => undefined,
});

defineAction('types.scalar-without-slot', {
  does: 'Reject a scalar without a slot',
  // @ts-expect-error scalar actions expose exactly one application payload slot
  invocation: 'scalar',
  mutate: () => undefined,
});

defineAction('types.scalar-with-several-slots', {
  does: 'Reject a scalar listener shape',
  // @ts-expect-error multi-argument listeners must use host invocation
  invocation: 'scalar',
  mutate: (_left: string, _right: number) => undefined,
});

defineAction('types.scalar-with-receiver', {
  does: 'Reject a receiver-sensitive scalar',
  // @ts-expect-error receiver-sensitive listeners must use host invocation
  invocation: 'scalar',
  mutate(this: { prefix: string }, value: string) {
    return `${this.prefix}:${value}`;
  },
});

defineAction('types.inputless-with-schema', {
  does: 'Reject a payload schema on an inputless action',
  // @ts-expect-error inputless actions may only use the explicit none marker
  invocation: 'inputless',
  // @ts-expect-error the schema itself contradicts inputless mode
  inputSchema,
  mutate: () => undefined,
});

defineAction('types.scalar-with-none', {
  does: 'Reject the none marker on a scalar action',
  // @ts-expect-error scalar actions cannot declare the no-input marker
  invocation: 'scalar',
  // @ts-expect-error the none marker itself contradicts scalar mode
  inputSchema: 'none',
  mutate: (_value: string) => undefined,
});

defineAction('types.host-with-schema', {
  does: 'Reject a broker schema on a host listener',
  invocation: 'host',
  // @ts-expect-error host continuations preserve arguments instead of schemas
  inputSchema,
  mutate: (_left: string, _right: number) => undefined,
});

const _legacyGraphAction = {
  does: 'Graph declarations keep their independent v1 vocabulary',
  input: inputSchema,
} satisfies ActionDef;

runtime.bindings(scalarConnection.definition);
runtime.bindingFor(scalarConnection.binding);
// @ts-expect-error structured definition refs replace string lookup
runtime.bindings('types.scalar');
// @ts-expect-error structured binding refs replace string lookup
runtime.bindingFor('binding:1');
// @ts-expect-error runtime-wide offer generation is not an authority
runtime.available(scalar);
// @ts-expect-error only a principal-scoped port can invoke an offer
runtime.invoke(boundScalarOffer);
// @ts-expect-error principal ports accept definitions, not string lookups
agentPort.offers('types.scalar');

declare const zeroAdapter: ActionHostAdapter<
  Record<string, never>,
  object,
  object,
  object,
  ActionInvocationMiddleware<unknown, readonly [], undefined>,
  Record<string, never>
>;
useActionBinding(runtime, zero, {}, zeroAdapter, {
  node: 'types',
  coverage: 'executable',
});
useActionBinding(runtime, zero, {}, zeroAdapter, {
  node: 'types',
  coverage: 'executable',
  // @ts-expect-error React cannot add input to an inputless action
  input: () => undefined,
});

const asyncAction = defineAction('types.independent-host-result', {
  does: 'Keep action and host callback outputs independent',
  invocation: 'inputless',
  mutate: async () => 42,
});
connectAction(runtime, asyncAction, {
  node: 'types',
  onInvocation(invocation) {
    if (invocation.behavior === 'mutation') {
      void invocation.whenInvoked.then((outcome) => {
        if (outcome.status !== 'performed') return;
        const _actionOutput: number = outcome.produced;
      });
    } else {
      void invocation.whenInvoked.then((outcome) => {
        if (outcome.status !== 'performed') return;
        const _unknownHostOutput: unknown = outcome.produced;
        // @ts-expect-error core cannot invent a framework listener's result type
        const _hostOutputIsNotActionOutput: number = outcome.produced;
      });
    }
  },
});
type VoidHostProps = { readonly onPress: () => void };
declare const voidHostAdapter: ActionHostAdapter<
  VoidHostProps,
  object,
  object,
  object,
  ActionInvocationMiddleware<unknown, readonly [], void>,
  VoidHostProps
>;
useActionBinding(
  runtime,
  asyncAction,
  { onPress: () => undefined },
  voidHostAdapter,
  {
    node: 'types',
    coverage: 'executable',
    onInvocation(invocation) {
      if (invocation.behavior === 'host-continuation') {
        void invocation.whenInvoked.then((outcome) => {
          if (outcome.status !== 'performed') return;
          const _hostProduced: void = outcome.produced;
          // @ts-expect-error a host listener's void result is not the mutation's number
          const _hostIsNotActionOutput: number = outcome.produced;
        });
      } else {
        void invocation.whenInvoked.then((outcome) => {
          if (outcome.status !== 'performed') return;
          const _actionProduced: number = outcome.produced;
          // @ts-expect-error a direct/brokered mutation does not produce the host's void result
          const _actionIsNotHostOutput: void = outcome.produced;
        });
      }
    },
  },
);

// ── settle.onReturn (2.6.0): the verdict's outcome is typed from mutate ──────
interface RefetchReplyForTypes {
  readonly status: 'refetched' | 'refused';
  readonly reason?: string;
}
// Output is inferred from an annotated mutate whatever the key order: the
// verdict is written BEFORE mutate here, and still sees the reply type.
defineAction('types.on-return-order', {
  does: 'Refetch and judge the reply',
  invocation: 'scalar',
  settle: {
    evidence: { kind: 'types.dataset' },
    onReturn: (outcome) => {
      if (outcome.status === 'failed') {
        return { status: 'refused', reason: String(outcome.error) };
      }
      const _reply: RefetchReplyForTypes = outcome.produced;
      // @ts-expect-error the produced value is the reply envelope, not a string
      const _notAString: string = outcome.produced;
      return outcome.produced.status === 'refetched'
        ? { status: 'verified', evidence: outcome.produced }
        : undefined;
    },
  },
  mutate: (_range: string): RefetchReplyForTypes => ({ status: 'refetched' }),
});
// An async mutate's verdict sees the awaited value.
defineAction('types.on-return-async', {
  does: 'Refetch asynchronously',
  invocation: 'inputless',
  settle: {
    onReturn: (outcome) =>
      outcome.status === 'performed' && outcome.produced > 0
        ? { status: 'refused', reason: 'nothing to prove' }
        : undefined,
  },
  mutate: async () => 3,
});
defineAction('types.on-return-host', {
  does: 'Press',
  invocation: 'host',
  // @ts-expect-error a host continuation runs the listener, not mutate — no return to judge
  settle: { onReturn: () => undefined },
  mutate: (_event: unknown) => undefined,
});
const _badVerdict: ActionSettleContract = {
  // @ts-expect-error a verdict is a settlement record or undefined
  onReturn: () => ({ status: 'done' }),
};
// invokedBy never files a direct invocation under 'unknown' — absence does that.
connectAction(createActionRuntime(), scalar, {
  node: 'types',
  // @ts-expect-error 'unknown' is what omitting invokedBy already says
  invokedBy: 'unknown',
});
// 2.6.0 CHANGED for implementers (CHANGELOG "Changed"): ActionRuntime gained two
// REQUIRED members and every snapshot carries a REQUIRED attribution, so code
// that hand-implements the runtime or builds snapshot fakes must add them. These
// pins keep that sentence true — make any of them optional and the CHANGELOG lies.
declare const _withoutTransitions: Omit<ActionRuntime, 'transitions'>;
declare const _withoutDeclareContext: Omit<ActionRuntime, 'declareContext'>;
declare const _withoutAttribution: Omit<ActionTransitionSnapshot, 'attribution'>;
// @ts-expect-error a hand-implemented runtime must implement transitions(query?)
const _runtimeNeedsTransitions: ActionRuntime = _withoutTransitions;
// @ts-expect-error a hand-implemented runtime must implement declareContext(declaration)
const _runtimeNeedsDeclareContext: ActionRuntime = _withoutDeclareContext;
// @ts-expect-error a snapshot fake must carry attribution
const _snapshotNeedsAttribution: ActionTransitionSnapshot = _withoutAttribution;
