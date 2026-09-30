import { describe, expect, it } from 'vitest';
import {
  connectAction,
  createActionRuntime,
  defineAction,
} from '../src/index.js';

/**
 * WHO INVOKED IT (2.6.0). A connection declares its direct caller with
 * `invokedBy`; every transition snapshot carries an `attribution`, minted by
 * the one certainty table — never passed in, never inferred from a
 * reporting flag.
 */
function refetchAction(id = 'panel.refetch-attribution') {
  return defineAction(id, {
    does: 'Re-run the series over the chosen range',
    invocation: 'scalar',
    mutate: (range: string) => `rows for ${range}`,
  });
}

describe('transition attribution', () => {
  it('files a direct invocation under unknown when the connection declares no caller', () => {
    const runtime = createActionRuntime();
    const connection = connectAction(runtime, refetchAction(), { node: 'panel' });
    const invocation = connection.invoke('7d');
    expect(invocation.transition.principal).toBe('unknown');
    expect(runtime.transitionFor(invocation.transition)?.attribution).toEqual({
      principal: 'unknown',
      basis: 'unknown',
      certainty: 'unknown',
    });
  });

  it('files a direct invocation under the declared invokedBy, caller-asserted', async () => {
    const runtime = createActionRuntime();
    const connection = connectAction(runtime, refetchAction(), {
      node: 'panel',
      humanReporting: 'connection',
      invokedBy: 'user',
    });
    const invocation = connection.invoke('7d');
    await invocation.whenInvoked;
    expect(invocation.transition.principal).toBe('user');
    const snapshot = runtime.transitionFor(invocation.transition)!;
    expect(snapshot.attribution).toEqual({
      principal: 'user',
      basis: 'caller-asserted',
      certainty: 'observed',
    });
    expect(Object.isFrozen(snapshot.attribution)).toBe(true);
    expect(structuredClone(snapshot.attribution)).toEqual(snapshot.attribution);
  });

  it('stamps a preflight refusal with the same declared caller', async () => {
    const runtime = createActionRuntime();
    const guarded = defineAction('panel.refetch-validated', {
      does: 'Re-run the series over the chosen range',
      invocation: 'scalar',
      inputSchema: { safeParse: (value: unknown) => ({ success: value === 'ok' }) },
      mutate: (range: string) => range,
    });
    const connection = connectAction(runtime, guarded, {
      node: 'panel',
      invokedBy: 'system',
    });
    const invocation = connection.invoke('bad');
    expect((await invocation.whenInvoked).status).toBe('refused');
    expect(runtime.transitionFor(invocation.transition)?.attribution.principal).toBe(
      'system',
    );
  });

  it('stamps a host continuation with the declared caller', async () => {
    const runtime = createActionRuntime();
    const press = defineAction('panel.press-attribution', {
      does: 'Press the control',
      invocation: 'host',
      mutate: (_event: unknown) => undefined,
    });
    const connection = connectAction(runtime, press, {
      node: 'panel',
      invokedBy: 'user',
    });
    const invocation = connection.invokeContinuation(() => 3);
    expect(await invocation.whenInvoked).toMatchObject({ produced: 3 });
    expect(runtime.transitionFor(invocation.transition)?.attribution).toMatchObject({
      principal: 'user',
      basis: 'caller-asserted',
    });
  });

  it('lets the principal port stamp its own principal, whatever the connection declared', () => {
    const runtime = createActionRuntime();
    const archive = defineAction('panel.clear-attribution', {
      does: 'Clear the chosen range',
      invocation: 'inputless',
      mutate: () => true,
    });
    connectAction(runtime, archive, { node: 'panel', invokedBy: 'user' });
    const port = runtime.forPrincipal('agent');
    const invocation = port.invoke(port.offers(archive)[0]!);
    expect(invocation.transition.principal).toBe('agent');
    expect(runtime.transitionFor(invocation.transition)?.attribution).toEqual({
      principal: 'agent',
      basis: 'caller-asserted',
      certainty: 'observed',
    });
  });

  it('refuses at connect a declared caller the definition does not allow', () => {
    const runtime = createActionRuntime();
    const agentOnly = defineAction('panel.agent-only', {
      does: 'Summarise the panel',
      invocation: 'inputless',
      principal: { mayInvoke: ['agent'] },
      mutate: () => 'summary',
    });
    expect(() =>
      connectAction(runtime, agentOnly, { node: 'panel', invokedBy: 'user' }),
    ).toThrow(/declares invokedBy 'user', but action definition 'panel\.agent-only' may be invoked only by agent/);
    expect(runtime.bindings()).toEqual([]);
    const connection = connectAction(runtime, agentOnly, {
      node: 'panel',
      invokedBy: 'agent',
    });
    expect(connection.invoke().transition.principal).toBe('agent');
  });

  it('refuses invokedBy unknown and anything that is not a principal', () => {
    const runtime = createActionRuntime();
    const action = refetchAction();
    expect(() =>
      connectAction(runtime, action, {
        node: 'panel',
        invokedBy: 'unknown' as never,
      }),
    ).toThrow(/omit invokedBy/);
    expect(() =>
      connectAction(runtime, action, {
        node: 'panel',
        invokedBy: 'robot' as never,
      }),
    ).toThrow(/principal must be user, agent, system, or unknown/);
  });

  it('is never read off humanReporting', () => {
    const runtime = createActionRuntime();
    const connection = connectAction(runtime, refetchAction(), {
      node: 'panel',
      humanReporting: 'connection',
    });
    const invocation = connection.invoke('7d');
    expect(runtime.transitionFor(invocation.transition)?.attribution.principal).toBe(
      'unknown',
    );
  });
});
