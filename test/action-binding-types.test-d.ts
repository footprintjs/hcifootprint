/** Compile-time laws for the scalar direct-invocation door. */
import {
  actionDefinitionOf,
  connectAction,
  createActionBindingRuntime,
  defineAction,
  type ActionOfferedInvoke,
  type ActionHostAdapter,
  type ActionInvocationMiddleware,
} from '../src/index.js';
import { useActionBinding } from '../src/react/index.js';

const runtime = createActionBindingRuntime();

const scalar = defineAction(
  'types.scalar',
  { does: 'Run a scalar action' },
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
const scalarOffer = runtime.available(scalarConnection.definition)[0]!.ref;
// @ts-expect-error offer inventories are immutable protocol snapshots
runtime.available(scalarConnection.definition).push({});
scalarConnection.invokeOffered({ offer: scalarOffer }, 'value');
// @ts-expect-error a required payload still cannot disappear merely because an offer exists
scalarConnection.invokeOffered({ offer: scalarOffer });
// @ts-expect-error an offered invocation always carries an exact offer
scalarConnection.invokeOffered({});
scalarWithReader.invokeOffered({ offer: scalarOffer });

const zero = defineAction(
  'types.zero',
  { does: 'Run without input' },
  () => undefined,
);
// @ts-expect-error a zero-argument definition cannot acquire an input reader
connectAction(runtime, zero, { node: 'types', input: () => undefined });
// @ts-expect-error the runtime method enforces the same zero-argument law
runtime.connect(zero, { node: 'types', input: () => undefined });
const zeroConnection = connectAction(runtime, zero, { node: 'types' });
const zeroOffer = runtime.available(zeroConnection.definition)[0]!.ref;
zeroConnection.invoke();
zeroConnection.invokeOffered({ offer: zeroOffer });
// @ts-expect-error a zero-argument definition has no explicit undefined form
zeroConnection.invoke(undefined);
// @ts-expect-error every type-valid zero-argument offered form preserves arity zero
zeroConnection.invokeOffered({ offer: zeroOffer }, undefined);
const _rootOfferedExport: ActionOfferedInvoke<typeof zero, 'types.zero'> =
  zeroConnection.invokeOffered;

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

const optional = defineAction(
  'types.optional',
  { does: 'Run with optional input' },
  (value?: string) => value,
);
const optionalConnection = connectAction(runtime, optional, { node: 'types' });
optionalConnection.invoke();
optionalConnection.invoke('explicit');
const optionalWithReader = connectAction(runtime, optional, {
  node: 'types',
  input: () => 'committed',
});
optionalWithReader.invoke();

const many = defineAction(
  'types.many',
  { does: 'Run a listener with several arguments' },
  (left: string, right: number) => `${left}:${right}`,
);
const manyConnection = connectAction(runtime, many, { node: 'types' });
// @ts-expect-error direct invocation cannot discard a listener argument
manyConnection.invoke('left');
manyConnection.invokeContinuation(() => many('left', 1));

const receiver = defineAction(
  'types.receiver',
  { does: 'Run a receiver-sensitive listener' },
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

const readonly = defineAction(
  'types.readonly',
  {
    does: 'Expose immutable declaration metadata',
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

const other = defineAction(
  'types.other',
  { does: 'Run another action' },
  () => undefined,
);
const otherConnection = connectAction(runtime, other, { node: 'types' });
// @ts-expect-error an offer for another definition cannot select this binding
otherConnection.invokeOffered({ offer: scalarOffer });
