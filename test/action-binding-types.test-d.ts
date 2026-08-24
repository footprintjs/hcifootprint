/** Compile-time laws for the scalar direct-invocation door. */
import {
  actionDefinitionOf,
  connectAction,
  createActionBindingRuntime,
  defineAction,
  type ActionDef,
  type ActionHostAdapter,
  type ActionInvocation,
  type ActionInvocationMiddleware,
  type BoundActionOffer,
  type InputlessActionOffer,
  type OpenActionOffer,
} from '../src/index.js';
import { useActionBinding } from '../src/react/index.js';

const runtime = createActionBindingRuntime();

const scalar = defineAction(
  'types.scalar',
  { does: 'Run a scalar action', invocation: 'scalar' },
  (value: string) => value.length,
);
const scalarConnection = connectAction(runtime, scalar, { node: 'types' });
scalarConnection.invoke('value');
// @ts-expect-error a required payload cannot disappear without an input reader
scalarConnection.invoke();
// @ts-expect-error update cannot widen this connection's input-reader type-state
scalarConnection.update({ input: () => 'later' });
const scalarWithReader = connectAction(runtime, scalar, {
  node: 'types',
  input: () => 'committed',
});
scalarWithReader.invoke();
scalarWithReader.update({ input: undefined });
scalarWithReader.invoke();
scalarWithReader.touch();
// @ts-expect-error a bound connection owns its payload and cannot be overridden
scalarWithReader.invoke('replacement');
// @ts-expect-error touch has no payload or update slot
scalarWithReader.touch({});
// @ts-expect-error offer inventories are immutable protocol snapshots
runtime.available(scalarConnection.definition).push({});

const scalarOfferFromInventory = runtime.available(scalar)[0]!;
const _scalarOfferMode: 'scalar' =
  scalarOfferFromInventory.definition.contract.invocation;
if (scalarOfferFromInventory.inputMode === 'open') {
  const _typedOpenInvocation: ActionInvocation<number, 'types.scalar'> =
    runtime.invoke(scalarOfferFromInventory, 'value');
  // @ts-expect-error a concrete scalar inventory keeps its string payload type
  runtime.invoke(scalarOfferFromInventory, 42);
} else {
  const _typedBoundInvocation: ActionInvocation<number, 'types.scalar'> =
    runtime.invoke(scalarOfferFromInventory);
  // @ts-expect-error a concrete bound inventory never accepts a replacement slot
  runtime.invoke(scalarOfferFromInventory, 'replacement');
}

declare const boundScalarOffer: BoundActionOffer<'types.scalar', typeof scalar>;
declare const openScalarOffer: OpenActionOffer<'types.scalar', typeof scalar>;
runtime.invoke(boundScalarOffer);
runtime.invoke(openScalarOffer, 'value');
// @ts-expect-error bound runtime offers accept no replacement payload
runtime.invoke(boundScalarOffer, 'replacement');
// @ts-expect-error a required open action needs caller input
runtime.invoke(openScalarOffer);

const zero = defineAction(
  'types.zero',
  { does: 'Run without input', invocation: 'inputless' },
  () => undefined,
);
// @ts-expect-error a zero-argument definition cannot acquire an input reader
connectAction(runtime, zero, { node: 'types', input: () => undefined });
// @ts-expect-error the runtime method enforces the same zero-argument law
runtime.connect(zero, { node: 'types', input: () => undefined });
const zeroConnection = connectAction(runtime, zero, { node: 'types' });
zeroConnection.invoke();
// @ts-expect-error a zero-argument definition has no explicit undefined form
zeroConnection.invoke(undefined);
declare const inputlessZeroOffer: InputlessActionOffer<'types.zero', typeof zero>;
runtime.invoke(inputlessZeroOffer);
// @ts-expect-error an inputless runtime offer has no explicit undefined form
runtime.invoke(inputlessZeroOffer, undefined);
const zeroOfferFromInventory = runtime.available(zero)[0]!;
const _typedInputlessInventory: InputlessActionOffer<'types.zero', typeof zero> =
  zeroOfferFromInventory;
const _inputlessOfferMode: 'inputless' =
  zeroOfferFromInventory.definition.contract.invocation;
runtime.invoke(zeroOfferFromInventory);

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
  // @ts-expect-error the React hook cannot add an input reader to a zero-argument action
  input: () => undefined,
});
useActionBinding(runtime, zero, {}, zeroAdapter, {
  node: 'types',
  coverage: 'executable',
  // @ts-expect-error a zero-argument action cannot declare an input key
  inputKey: 'none',
});

declare const scalarAdapter: ActionHostAdapter<
  Record<string, never>,
  object,
  object,
  object,
  ActionInvocationMiddleware<unknown, readonly [], number>,
  Record<string, never>
>;
useActionBinding(runtime, scalar, {}, scalarAdapter, {
  node: 'types',
  input: () => 'committed',
  inputKey: 'generation-1',
});
// @ts-expect-error an input reader must declare its semantic generation key
useActionBinding(runtime, scalar, {}, scalarAdapter, {
  node: 'types',
  input: () => 'committed',
});
// @ts-expect-error an input key without a reader has no meaning
useActionBinding(runtime, scalar, {}, scalarAdapter, {
  node: 'types',
  inputKey: 'generation-1',
});

const optional = defineAction(
  'types.optional',
  {
    does: 'Run with optional input',
    invocation: 'scalar',
    inputSchema: { safeParse: () => ({ success: true as const }) },
  },
  (value: string | undefined) => value,
);
const optionalConnection = connectAction(runtime, optional, { node: 'types' });
// @ts-expect-error scalar invocation always requires one deliberate payload slot
optionalConnection.invoke();
optionalConnection.invoke(undefined);
optionalConnection.invoke('explicit');
const optionalWithReader = connectAction(runtime, optional, {
  node: 'types',
  input: () => 'committed',
});
optionalWithReader.invoke();

const many = defineAction(
  'types.many',
  { does: 'Run a listener with several arguments', invocation: 'host' },
  (left: string, right: number) => `${left}:${right}`,
);
const manyConnection = connectAction(runtime, many, { node: 'types' });
// @ts-expect-error direct invocation cannot discard a listener argument
manyConnection.invoke('left');
manyConnection.invokeContinuation(() => many('left', 1));
const _manyOffers: readonly never[] = runtime.available(many);
// @ts-expect-error host actions cannot mint runtime offers
runtime.available(many)[0].inputMode;

const receiver = defineAction(
  'types.receiver',
  { does: 'Run a receiver-sensitive listener', invocation: 'host' },
  function (this: { prefix: string }, value: string) {
    return `${this.prefix}:${value}`;
  },
);
const receiverConnection = connectAction(runtime, receiver, { node: 'types' });
// @ts-expect-error direct invocation cannot invent a listener receiver
receiverConnection.invoke('value');
receiverConnection.invokeContinuation(() =>
  receiver.call({ prefix: 'safe' }, 'value'),
);
const _receiverOffers: readonly never[] = runtime.available(receiver);
// @ts-expect-error receiver-sensitive host actions cannot mint runtime offers
runtime.available(receiver)[0].inputMode;

const readonly = defineAction(
  'types.readonly',
  {
    does: 'Expose immutable declaration metadata',
    invocation: 'inputless',
    writes: ['state.value'],
    principalPolicy: { mayInvoke: ['human'] },
  },
  () => undefined,
);
const contract = actionDefinitionOf(readonly)!.contract;
// @ts-expect-error declaration arrays are readonly through the public record
contract.writes?.push('state.attacker');
// @ts-expect-error nested policy arrays are readonly too
contract.principalPolicy?.mayInvoke?.push('agent');

const inputSchema = {
  safeParse: (_value: unknown) => ({ success: true as const }),
};
const schemaDefined = defineAction(
  'types.input-schema',
  { does: 'Use a declared input schema', invocation: 'scalar', inputSchema },
  (value: string) => value,
);
const schemaContract = actionDefinitionOf(schemaDefined)!.contract;
schemaContract.inputSchema;
connectAction(runtime, schemaDefined, {
  node: 'types',
  input: () => 'committed schema-shaped value',
});
// @ts-expect-error callable definitions separate their schema from live binding input
schemaContract.input;
// @ts-expect-error callable definitions separate their schema from live binding input
defineAction(
  'types.legacy-input-name',
  {
    does: 'Reject the legacy definition-side spelling',
    invocation: 'scalar',
    input: inputSchema,
  },
  (value: string) => value,
);
const _legacyGraphAction = {
  does: 'Keep the graph declaration spelling',
  input: inputSchema,
} satisfies ActionDef;

defineAction(
  'types.missing-invocation',
  // @ts-expect-error every callable definition must author its invocation mode
  { does: 'Reject an inferred invocation mode' },
  () => undefined,
);

defineAction(
  'types.inputless-with-slot',
  {
    does: 'Reject an inputless positional slot',
    // @ts-expect-error inputless actions must expose exactly zero positional slots
    invocation: 'inputless',
  },
  (_value: string) => undefined,
);

defineAction(
  'types.scalar-without-slot',
  {
    does: 'Reject a scalar without a slot',
    // @ts-expect-error scalar actions must expose exactly one positional slot
    invocation: 'scalar',
  },
  () => undefined,
);

defineAction(
  'types.scalar-with-several-slots',
  {
    does: 'Reject a scalar listener shape',
    // @ts-expect-error multi-argument listeners must declare host invocation
    invocation: 'scalar',
  },
  (_left: string, _right: number) => undefined,
);

defineAction(
  'types.scalar-with-receiver',
  {
    does: 'Reject a receiver-sensitive scalar',
    // @ts-expect-error receiver-sensitive listeners must declare host invocation
    invocation: 'scalar',
  },
  function (this: { prefix: string }, value: string) {
    return `${this.prefix}:${value}`;
  },
);

defineAction(
  'types.inputless-with-schema',
  {
    does: 'Reject a payload schema on an inputless action',
    invocation: 'inputless',
    // @ts-expect-error inputless actions may only use the explicit none marker
    inputSchema,
  },
  () => undefined,
);

defineAction(
  'types.scalar-with-none',
  {
    does: 'Reject the none marker on a scalar action',
    invocation: 'scalar',
    // @ts-expect-error scalar actions cannot declare the no-input marker
    inputSchema: 'none',
  },
  (_value: string) => undefined,
);

defineAction(
  'types.host-with-schema',
  {
    does: 'Reject a broker schema on a host listener',
    invocation: 'host',
    // @ts-expect-error host continuations preserve arguments instead of broker payloads
    inputSchema,
  },
  (_left: string, _right: number) => undefined,
);
