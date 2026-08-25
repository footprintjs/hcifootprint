import { describe, expect, it } from 'vitest';
import { buildNavigationGraph, contextful } from '../src/index.js';

describe('a transition captures the binding it selected before deferred invocation', () => {
  it('cannot execute a replacement handler connected after fire returned', async () => {
    const graph = buildNavigationGraph('exact-binding', {
      pages: { orders: { actions: { archive: { does: 'Archive an order' } } } },
    });
    const session = graph.createSession({ node: 'orders' });
    const calls: string[] = [];
    const first = session.registerAction('orders', 'archive', {
      does: '',
      handler: () => calls.push('first'),
    });

    let swapped = false;
    session.on('transition', (record) => {
      if (swapped || record.cause.kind !== 'fired') return;
      swapped = true;
      // fire() emits the row before it schedules the invocation. A listener is
      // therefore able to replace the live registration between the capability
      // gate and the old second lookup.
      first.unregister();
      session.registerAction('orders', 'archive', {
        does: '',
        handler: () => calls.push('replacement'),
      });
    });

    const fired = session.fire('orders.archive', { source: 'agent' });
    expect(fired.ok).toBe(true);
    if (!fired.ok) throw new Error('fire was unexpectedly refused');
    await fired.whenSettled;
    expect(calls).toEqual(['first']);
  });

  it('keeps the selected contextful handler capture policy when a listener replaces it', async () => {
    const graph = buildNavigationGraph('exact-context', {
      pages: { orders: { actions: { archive: { does: 'Archive an order' } } } },
    });
    const session = graph.createSession({ node: 'orders' });
    const calls: string[] = [];
    const selected = contextful(
      () => {
        calls.push('selected');
      },
      { include: ['selected'] },
    );
    const replacement = contextful(
      () => {
        calls.push('replacement');
      },
      { include: ['replacement'] },
    );
    const first = session.registerAction('orders', 'archive', {
      does: '',
      handler: selected,
    });

    let swapped = false;
    session.on('transition', (record) => {
      if (swapped || record.cause.kind !== 'fired') return;
      swapped = true;
      first.unregister();
      session.registerAction('orders', 'archive', {
        does: '',
        handler: replacement,
      });
    });

    const fired = session.fire('orders.archive', {
      source: 'agent',
      payload: { selected: 'from-a', replacement: 'from-b' },
    });
    expect(fired.ok).toBe(true);
    if (!fired.ok) throw new Error('fire was unexpectedly refused');
    await fired.whenSettled;

    expect(calls).toEqual(['selected']);
    expect(fired.transition.captured?.before.input).toEqual({ selected: 'from-a' });
  });

  it('keeps wrapper A capture policy when wrapper B supersedes it before A is called directly', () => {
    const graph = buildNavigationGraph('exact-direct-context', {
      pages: { orders: { actions: { archive: { does: 'Archive an order' } } } },
    });
    const session = graph.createSession({
      node: 'orders',
      onWarn: () => undefined,
    });
    const calls: string[] = [];
    const selected = contextful(
      (input: unknown) => {
        calls.push('selected');
        return (input as { selected: string }).selected;
      },
      { include: ['selected'] },
    );
    const replacement = contextful(
      (input: unknown) => {
        calls.push('replacement');
        return (input as { replacement: string }).replacement;
      },
      { include: ['replacement'] },
    );
    session.registerAction('orders', 'archive', {
      does: '',
      handler: selected,
    });
    session.registerAction('orders', 'archive', {
      does: '',
      handler: replacement,
    });

    const returned = selected({
      selected: 'from-a',
      replacement: 'from-b',
    });

    expect(returned).toBe('from-a');
    expect(calls).toEqual(['selected']);
    expect(session.transitions()).toHaveLength(1);
    expect(session.transitions()[0]?.captured?.before.input).toEqual({
      selected: 'from-a',
    });
  });

  it('cannot redirect a selected contextful invocation into a new session site', async () => {
    const graph = buildNavigationGraph('exact-context-site', {
      pages: { orders: { actions: { archive: { does: 'Archive an order' } } } },
    });
    const firstSession = graph.createSession({ node: 'orders' });
    const secondSession = graph.createSession({ node: 'orders' });
    const calls: string[] = [];
    const selected = contextful(() => {
      calls.push('selected');
    });
    const firstRegistration = firstSession.registerAction('orders', 'archive', {
      does: '',
      handler: selected,
    });

    let moved = false;
    firstSession.on('transition', (record) => {
      if (moved || record.cause.kind !== 'fired') return;
      moved = true;
      firstRegistration.unregister();
      secondSession.registerAction('orders', 'archive', {
        does: '',
        handler: selected,
      });
    });

    const fired = firstSession.fire('orders.archive', { source: 'agent' });
    expect(fired.ok).toBe(true);
    if (!fired.ok) throw new Error('fire was unexpectedly refused');
    await fired.whenSettled;

    expect(calls).toEqual(['selected']);
    expect(
      secondSession
        .transitions()
        .filter((record) => record.cause.kind === 'fired'),
    ).toEqual([]);
  });
});
