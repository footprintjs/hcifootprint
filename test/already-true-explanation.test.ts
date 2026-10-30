/** Preheld verify conditions are evidence about fire time, not an action result. */
import { describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { buildNavigationGraph, serveToAgent } from '../src/index.js';
import type { InteractionSession, ServeResult } from '../src/index.js';
import { mcpServer } from '../src/mcp.js';

function desk(handler: (input: unknown, session: InteractionSession) => unknown) {
  const graph = buildNavigationGraph('desk', {
    pages: {
      home: {
        actions: {
          set: {
            does: 'Set the quantity',
            input: {
              type: 'object',
              properties: { quantity: { type: 'number' } },
              required: ['quantity'],
              additionalProperties: false,
            },
            writes: ['quantity'],
            // This broad postcondition already holds at seed 1. It does not
            // establish that the requested quantity is valid or already set.
            verify: { quantity: { gte: 1, lte: 99 } },
          },
        },
      },
    },
  });
  const session = graph.createSession({
    node: 'home',
    state: { quantity: 1 },
    requireHumanApproval: true,
    onWarn: () => undefined,
  });
  session.registerActions('home', { handlers: { set: (input) => handler(input, session) } });
  return { session, port: serveToAgent(session, { source: 'agent' }) };
}

function expectHistoricalEvidence(answer: ServeResult) {
  expect(answer['alreadyTrue']).toHaveLength(2);
  expect(answer['why']).toContain('held before this action fired');
  expect(answer['why']).toContain('not whether the action succeeded or changed anything');
  expect(answer['why']).toContain('effectStatus, outcome, outcomeNow');
  expect(answer['why']).not.toMatch(/nothing needed changing|nothing was written|Do not wait|hold right now/);
}

const text = (result: unknown): ServeResult =>
  JSON.parse((result as { content: { text: string }[] }).content[0]!.text) as ServeResult;

describe('alreadyTrue explains its evidence without overruling the actual result', () => {
  it('retains the invalid-quantity failure beside the fire-time range evidence', async () => {
    let calls = 0;
    const { session, port } = desk(() => {
      calls++;
      throw new Error('quantity must be between 1 and 99');
    });
    const fired = port.call('desk.do_action', { action: 'set', input: { quantity: 0 } });
    const id = fired['transitionId'] as string;
    expect(fired['ok']).toBe(true);
    await session.settlementOf(id);
    const answer = port.call('desk.did_it_work', { transitionId: id });
    expect(answer).toMatchObject({
      settled: true,
      effectStatus: 'refused',
      outcome: 'rejected',
      error: 'Error: quantity must be between 1 and 99',
    });
    expect(calls).toBe(1);
    expect(session.state()['quantity']).toBe(1);
    expectHistoricalEvidence(fired);
    expectHistoricalEvidence(answer);
    expect(port.settledAnswer(id)).toMatchObject({ why: answer['why'], error: answer['error'] });
  });

  it('does not call a successful write a no-op merely because a broad range held before it', async () => {
    const { session, port } = desk((_input, live) => live.updateState({ quantity: 3 }));
    const fired = port.call('desk.do_action', { action: 'set', input: { quantity: 3 } });
    const id = fired['transitionId'] as string;
    await session.settlementOf(id);
    const answer = port.call('desk.did_it_work', { transitionId: id });
    expect(answer).toMatchObject({ effectStatus: 'performed', outcome: 'committed', writesObserved: true, verifyHeld: true });
    expect(session.state()['quantity']).toBe(3);
    expect(answer['alreadyTrue']).toEqual(fired['alreadyTrue']);
    expect(JSON.stringify(answer['alreadyTrue'])).toContain('"actualSummary":"1"');
    expectHistoricalEvidence(answer);
  });

  it('leaves an unfinished handler pending and later exposes its rejection', async () => {
    let reject!: (reason: Error) => void;
    const work = new Promise<void>((_resolve, refuse) => { reject = refuse; });
    const { session, port } = desk(() => work);
    const fired = port.call('desk.do_action', { action: 'set', input: { quantity: 3 } });
    const id = fired['transitionId'] as string;
    expect(port.settledAnswer(id)).toBeUndefined();
    expect(port.call('desk.did_it_work', { transitionId: id })).toMatchObject({ settled: false, judgment: 'still-pending' });
    reject(new Error('the write was refused later'));
    await session.settlementOf(id);
    const answer = port.call('desk.did_it_work', { transitionId: id });
    expect(answer).toMatchObject({ effectStatus: 'refused', error: 'Error: the write was refused later' });
    expectHistoricalEvidence(fired);
    expectHistoricalEvidence(answer);
  });

  it('does not describe the earlier conditions as current after the handler makes verify false', async () => {
    const { session, port } = desk((_input, live) => live.updateState({ quantity: 0 }));
    const fired = port.call('desk.do_action', { action: 'set', input: { quantity: 3 } });
    const id = fired['transitionId'] as string;
    await session.settlementOf(id);
    const answer = port.call('desk.did_it_work', { transitionId: id });
    expect(answer).toMatchObject({ effectStatus: 'refused', writesObserved: true, verifyHeld: false });
    expect(session.state()['quantity']).toBe(0);
    expectHistoricalEvidence(answer);
  });

  it('keeps a late rollback and its instruction beside the original receipt', async () => {
    const { session, port } = desk((_input, live) => live.updateState({ quantity: 3 }));
    const fired = port.call('desk.do_action', { action: 'set', input: { quantity: 3 } });
    const id = fired['transitionId'] as string;
    await session.settlementOf(id);
    session.reject(id);
    const answer = port.call('desk.did_it_work', { transitionId: id });
    expect(answer).toMatchObject({ effectStatus: 'performed', outcome: 'committed', outcomeNow: 'rolled-back' });
    expect(answer['howToAct']).toBeTypeOf('string');
    expect(session.settlementIfKnown(id)).toMatchObject({ effectStatus: 'performed', outcome: 'committed' });
    expectHistoricalEvidence(answer);
  });

  it('serves the same truthful explanation through the real MCP client and folded settlement', async () => {
    const { session, port } = desk(() => { throw new Error('quantity must be between 1 and 99'); });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = mcpServer(session);
    await server.connect(serverTransport);
    const client = new Client({ name: 'already-true-regression', version: '0.0.0' });
    await client.connect(clientTransport);
    try {
      const answer = text(await client.callTool({ name: 'desk.do_action', arguments: { action: 'set', input: { quantity: 0 } } }));
      expect(answer).toMatchObject({ effectStatus: 'refused', outcome: 'rejected', error: 'Error: quantity must be between 1 and 99' });
      const id = answer['transitionId'] as string;
      expect(port.settledAnswer(id)).toMatchObject({ why: answer['why'], error: answer['error'] });
      expectHistoricalEvidence(answer);
    } finally {
      await client.close();
      await server.close();
    }
  });
});
