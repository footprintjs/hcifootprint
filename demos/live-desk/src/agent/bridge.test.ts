/**
 * The bridge is two jobs: legal names, and the data channel. Both pinned here.
 */
import { describe, expect, it } from 'vitest';
import { NAMED_TICKET_ID } from '../app/tickets.js';
import { bootDesk } from '../desk/fixture.js';
import { createBridge, wireName } from './bridge.js';

const LLM_TOOL_NAME = /^[a-zA-Z0-9_-]{1,64}$/;

describe('the tool surface handed to the model', () => {
  it('is the four fixed generics, and every name is one an LLM will accept', async () => {
    const desk = await bootDesk();
    const bridge = createBridge(desk.session);
    const names = bridge.tools.map((tool) => tool.schema.name).sort();
    // This desk declares no skills — every action arrives at runtime — so Mode
    // B's array is exactly its generics (src/serve/modes.ts builds four:
    // whats_here, do_action, why, and did_it_work for the settled truth).
    expect(names).toEqual(['desk__did_it_work', 'desk__do_action', 'desk__whats_here', 'desk__why']);
    for (const name of names) expect(name).toMatch(LLM_TOOL_NAME);
  });

  it('substitutes the dot the providers reject', () => {
    expect(wireName('desk.whats_here')).toBe('desk__whats_here');
    expect('desk.whats_here').not.toMatch(LLM_TOOL_NAME);
  });

  it('does not change under the app: the array is the same bytes after the desk moves', async () => {
    const desk = await bootDesk();
    const bridge = createBridge(desk.session);
    const before = bridge.tools.map((tool) => tool.schema.name);
    desk.store.unmountControl('inbox-list');
    desk.store.commands.setTabSwitcherWired(true);
    expect(bridge.tools.map((tool) => tool.schema.name)).toEqual(before);
  });
});

describe('the data channel', () => {
  it('attaches what the handler produced, which the synchronous result could not carry', async () => {
    const desk = await bootDesk();
    const bridge = createBridge(desk.session);
    const doAction = bridge.tools.find((tool) => tool.schema.name === 'desk__do_action');
    expect(doAction).toBeDefined();

    const result = (await doAction!.execute(
      { action: 'list-tickets', input: { search: 'Priya' } },
      {} as never,
    )) as Record<string, unknown>;

    expect(result['ok']).toBe(true);
    const produced = result['produced'] as { matched: number; tickets: Array<{ id: string; from: string }> };
    expect(produced.matched).toBe(1);
    expect(produced.tickets[0]).toMatchObject({ id: NAMED_TICKET_ID, from: 'Priya Raman' });
    expect(bridge.calls).toHaveLength(1);
    expect(bridge.calls[0]?.name).toBe('desk__do_action');
  });

  it('passes a refusal through as data, with the reason the session gave', async () => {
    const desk = await bootDesk();
    const bridge = createBridge(desk.session);
    const doAction = bridge.tools.find((tool) => tool.schema.name === 'desk__do_action');
    const result = (await doAction!.execute({ action: 'switch-to-archive' }, {} as never)) as Record<string, unknown>;
    expect(result['ok']).toBe(false);
    expect(result['reason']).toBe('NOT_MATERIALIZED');
    expect(typeof result['why']).toBe('string');
  });
});
