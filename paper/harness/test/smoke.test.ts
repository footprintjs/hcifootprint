/**
 * Plumbing smoke tests — MockLLM, no API key. Each substrate runs a scripted
 * episode end-to-end; the interleave test IS the paper's core mechanism in
 * miniature: the user acts between agent turns, and the map substrate's
 * whats_changed delta names the user's actions.
 */
import { describe, expect, it } from 'vitest';
import { mockDriver } from '../src/driver.js';
import { runEpisode } from '../src/runner.js';
import type { Task } from '../src/tasks.js';
import { NO_INTERLEAVE } from '../src/interleave.js';
import { createDressShopApp } from '../src/apps/dress-shop/store.js';
import { mapSubstrate } from '../src/substrates/map.js';

const trivialTask = (over?: Partial<Task>): Task => ({
  id: 'smoke',
  prompt: 'smoke',
  script: NO_INTERLEAVE,
  success: () => true,
  probes: [],
  ...over,
});

describe('harness smoke — three substrates over one shared session', () => {
  it('map: fixed tools include skills + generics + the two wire-fix stand-ins', () => {
    const app = createDressShopApp({ onWarn: () => {} });
    const substrate = mapSubstrate(app.session);
    const names = substrate.tools().map((t) => t.name);
    expect(names).toContain('dress-shop__skill__purchase');
    expect(names).toContain('dress-shop__whats_here');
    expect(names).toContain('whats_changed');
    expect(names).toContain('why');
  });

  it('map: a scripted episode fires through do_action and the session moves', async () => {
    const episode = await runEpisode({
      task: trivialTask(),
      substrate: 'map',
      driver: mockDriver([
        { calls: [{ name: 'dress-shop__whats_here' }] },
        { calls: [{ name: 'dress-shop__do_action', input: { action: 'browse-dresses' } }] },
        { text: 'done' },
      ]),
    });
    expect(episode.finalNode).toBe('catalog');
    expect(episode.turns[0].toolCalls[0].result).toContain('brief');
  });

  it('flat: always-visible tools fire, and a blind fire fails tersely (no typed evidence)', async () => {
    const episode = await runEpisode({
      task: trivialTask(),
      substrate: 'flat',
      driver: mockDriver([
        { calls: [{ name: 'place-order' }] }, // blind: nothing in cart, wrong page
        { calls: [{ name: 'browse-dresses' }] },
        { calls: [{ name: 'search-dresses', input: { query: 'red' } }] },
        { text: 'done' },
      ]),
    });
    const first = episode.turns[0].toolCalls[0].result;
    expect(first).toContain('could not perform');
    expect(first).not.toContain('GUARD_FAILED'); // flat exposes no typed reasons
    expect(episode.finalState['resultCount']).toBeGreaterThan(0);
    expect(episode.turns[2].toolCalls[0].result).toContain('Floral Wrap Dress');
  });

  it('perception: read_page dumps the page; act clicks by accessible name', async () => {
    const episode = await runEpisode({
      task: trivialTask(),
      substrate: 'perception',
      driver: mockDriver([
        { calls: [{ name: 'read_page' }] },
        { calls: [{ name: 'act', input: { control: 'Shop dresses' } }] },
        { calls: [{ name: 'act', input: { control: 'Search', value: 'red' } }] },
        { text: 'done' },
      ]),
    });
    expect(episode.turns[0].toolCalls[0].result).toContain('[page] home');
    expect(episode.finalNode).toBe('catalog');
    expect(episode.turns[2].toolCalls[0].result).toContain('Floral Wrap Dress');
    // The dump carries untrusted content raw — the perception reality the paper states.
    expect(episode.turns[2].toolCalls[0].result).toContain('IGNORE PREVIOUS INSTRUCTIONS');
  });

  it('interleave: the user acts between turns and whats_changed names it (the paper, in one test)', async () => {
    const task = trivialTask({
      script: {
        level: 'light',
        kind: 'augmenting',
        steps: [
          {
            afterAgentTurn: 1,
            actions: [
              { kind: 'goto', page: 'catalog' },
              { kind: 'fire', id: 'search-dresses', payload: { query: 'red' } },
              { kind: 'fire', id: 'view-dress', payload: { dressId: 'd3' } },
              { kind: 'fire', id: 'add-to-cart' },
            ],
          },
        ],
      },
    });
    const episode = await runEpisode({
      task,
      substrate: 'map',
      driver: mockDriver([
        { calls: [{ name: 'dress-shop__whats_here' }] },
        { calls: [{ name: 'whats_changed', input: { sinceVersion: 0 } }] },
        { calls: [{ name: 'why', input: { key: 'cartIds' } }] },
        { text: 'done' },
      ]),
    });
    expect(episode.turns[0].interleaved.length).toBe(4);
    const delta = episode.turns[1].toolCalls[0].result;
    expect(delta).toContain('user fired add-to-cart'); // provenance: WHO
    expect(delta).toContain('user fired search-dresses');
    const why = episode.turns[2].toolCalls[0].result;
    expect(why).toContain('add-to-cart'); // the causal writer of cartIds
    expect(episode.finalState['cartCount']).toBe(1);
  });

  it('ground truth: user and agent fires interleave with correct principals in transitions()', async () => {
    const task = trivialTask({
      script: {
        level: 'light',
        kind: 'diverging',
        steps: [{ afterAgentTurn: 1, actions: [{ kind: 'goto', page: 'orders' }] }],
      },
    });
    const episode = await runEpisode({
      task,
      substrate: 'flat',
      driver: mockDriver([
        { calls: [{ name: 'browse-dresses' }] },
        { calls: [{ name: 'search-dresses', input: { query: 'red' } }] },
        { text: 'done' },
      ]),
    });
    const principals = (episode.transitions as { cause?: { principal?: string } }[]).map(
      (t) => t.cause?.principal,
    );
    expect(principals).toContain('agent');
    // The diverging goto lands as world motion (sync), not as an agent action.
    expect(episode.turns[0].interleaved).toEqual([{ kind: 'goto', page: 'orders' }]);
  });
});
