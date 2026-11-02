import { describe, expect, it } from 'vitest';
import * as hci from '../src/index.js';

function setup() {
  let calls = 0;
  const action = hci.defineAction('orders.refusal-proof', {
    does: 'Read the selected order', invocation: 'scalar',
    mutate: (input: { id: string }) => { calls++; return input.id; },
  });
  const runtime = hci.createActionRuntime();
  const connection = hci.connectAction(runtime, action, { node: 'orders', input: () => ({ id: 'first' }) });
  const port = runtime.forPrincipal('agent');
  const offer = port.offers(action)[0]!;
  if (offer.inputMode !== 'bound') throw new Error('Expected the declared bound input');
  return { runtime, connection, port, offer, calls: () => calls };
}
function thrown(work: () => unknown): Error & { code?: string; execution?: string; nextStep?: string } {
  try { work(); } catch (error) { if (!(error instanceof Error)) throw error; return error; }
  throw new Error('Expected a pre-invocation refusal');
}

describe('machine-readable offer refusal before any invocation', () => {
  it('exports one class with a normal Error identity and explicit fields', () => {
    const error = new hci.ActionOfferRefusal('ACTION_OFFER_STALE', 'Read again');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(hci.ActionOfferRefusal);
    expect(error.name).toBe('ActionOfferRefusal');
    expect(error.message).toBe('Read again');
    expect(error.execution).toBe('not-started');
    expect(error.nextStep).toBe('read-current-offers');
  });
  it('stale without a current reread is a coded refusal, never an execution failure', () => {
    const s = setup(); s.connection.update({ input: () => ({ id: 'second' }) });
    const error = thrown(() => s.port.invoke(s.offer));
    expect(error.code).toBe('ACTION_OFFER_STALE');
    expect(error.execution).toBe('not-started');
    expect(error.nextStep).toBe('read-current-offers');
    expect(error.message).toMatch(/no longer serves offers/);
    expect(s.calls()).toBe(0); expect(s.runtime.transitions()).toEqual([]);
  });
  it('stale with a current offer keeps the existing correction and does not auto-refresh or invoke', async () => {
    const s = setup(); s.connection.update({ input: () => ({ id: 'second' }) });
    const current = s.port.offers(s.connection.definition)[0]!;
    if (current.inputMode !== 'bound') throw new Error('Expected the current bound input');
    const error = thrown(() => s.port.invoke(s.offer));
    expect(error.code).toBe('ACTION_OFFER_STALE');
    expect(error.message).toContain(current.ref.offerId);
    expect(error.execution).toBe('not-started');
    expect(s.calls()).toBe(0); expect(s.runtime.transitions()).toEqual([]);
    expect((await s.port.invoke(current).whenInvoked).status).toBe('performed');
    expect(s.calls()).toBe(1);
  });
  it('detached offers refuse without inventing whether they were forged', () => {
    const s = setup(); s.connection.disconnect();
    const error = thrown(() => s.port.invoke(s.offer));
    expect(error.code).toBe('ACTION_OFFER_UNAVAILABLE');
    expect(error.execution).toBe('not-started');
    expect(error.message).toMatch(/will not guess/);
    expect(s.calls()).toBe(0);
  });
  it('a foreign runtime has no authority for the same offer', () => {
    const s = setup();
    const error = thrown(() => hci.createActionRuntime().forPrincipal('agent').invoke(s.offer));
    expect(error.code).toBe('ACTION_OFFER_UNAVAILABLE');
    expect(error.nextStep).toBe('read-current-offers');
    expect(s.calls()).toBe(0);
  });
  it('colliding local ids in two live runtimes do not make a foreign offer stale', async () => {
    const source = setup(), target = setup();
    expect(source.offer.ref.binding.bindingId).toBe(target.offer.ref.binding.bindingId);
    expect(source.offer.ref.offerId).toBe(target.offer.ref.offerId);
    expect(source.offer.ref.binding).not.toBe(target.offer.ref.binding);
    const error = thrown(() => target.port.invoke(source.offer));
    expect(error.code).toBe('ACTION_OFFER_UNAVAILABLE');
    expect(error.execution).toBe('not-started');
    expect(error.nextStep).toBe('read-current-offers');
    expect(source.calls()).toBe(0); expect(target.calls()).toBe(0);
    expect(source.runtime.transitions()).toEqual([]);
    expect(target.runtime.transitions()).toEqual([]);
    expect((await target.port.invoke(target.offer).whenInvoked).status).toBe('performed');
    expect(target.calls()).toBe(1); expect(source.calls()).toBe(0);
  });
  it('an existing live offer cannot cross principal authority', () => {
    const s = setup();
    // Deliberate negative control: runtime validation also protects untyped JS.
    const error = thrown(() => Reflect.apply(s.runtime.forPrincipal('system').invoke, undefined, [s.offer]));
    expect(error.code).toBe('ACTION_OFFER_WRONG_PRINCIPAL');
    expect(error.execution).toBe('not-started');
    expect(error.nextStep).toBe('use-matching-principal');
    expect(s.calls()).toBe(0); expect(s.runtime.transitions()).toEqual([]);
  });
  it('an application throwing the same class remains a failed invocation after admission', async () => {
    let calls = 0;
    const action = hci.defineAction('orders.handler-threw', {
      does: 'Keep admission separate from handler errors', invocation: 'inputless',
      mutate: () => { calls++; throw new hci.ActionOfferRefusal('ACTION_OFFER_STALE', 'Application threw'); },
    });
    const runtime = hci.createActionRuntime();
    hci.connectAction(runtime, action, { node: 'orders' });
    const port = runtime.forPrincipal('agent');
    const invocation = port.invoke(port.offers(action)[0]!);
    expect((await invocation.whenInvoked).status).toBe('failed');
    expect(calls).toBe(1); expect(runtime.transitions()).toHaveLength(1);
    expect(runtime.transitions()[0]!.invocationStatus).toBe('failed');
  });
});
