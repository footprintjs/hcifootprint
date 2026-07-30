/**
 * dedupe.ts — the turn window, which is the sensor's own answer to "one act, one
 * row" because the library has no dedupe primitive to lend it.
 *
 * Mutation proof: dedupe.ts did not exist before this change, so every test here
 * fails against pre-change source.
 */
import { describe, expect, it } from 'vitest';
import { createTurnWindow } from '../src/sensor/dedupe.js';
import { desk, settle } from './sensor-fixture.js';

describe('one claim per (edge, instance) per synchronous task', () => {
  it('the first claim wins and the repeat does not', () => {
    const turn = createTurnWindow();
    expect(turn.claim(desk.send)).toBe(true);
    expect(turn.claim(desk.send)).toBe(false);
    expect(turn.claim(desk.send)).toBe(false);
  });

  it('a different edge is a different row', () => {
    const turn = createTurnWindow();
    expect(turn.claim(desk.send)).toBe(true);
    expect(turn.claim(desk.archive)).toBe(true);
  });

  it('two instances of one edge are two rows — they are not the same row', () => {
    const turn = createTurnWindow();
    expect(turn.claim(desk.reply, 't-1')).toBe(true);
    expect(turn.claim(desk.reply, 't-2')).toBe(true);
    expect(turn.claim(desk.reply, 't-1')).toBe(false);
  });

  it('an instance-less claim and an instanced one are kept apart', () => {
    const turn = createTurnWindow();
    expect(turn.claim(desk.reply)).toBe(true);
    expect(turn.claim(desk.reply, 't-1')).toBe(true);
  });

  it('an app-chosen instance key cannot collide its way into another row', () => {
    // The join uses NUL precisely because an instance key is arbitrary app text: a
    // separator the parts can also contain is how two rows become one.
    const turn = createTurnWindow();
    expect(turn.claim('a', 'b')).toBe(true);
    expect(turn.claim('a:b')).toBe(true);
    expect(turn.claim('a', ':b')).toBe(true);
  });
});

describe('the window closes on a microtask — the session’s own coalescing window', () => {
  it('the next task may claim the same row again', async () => {
    const turn = createTurnWindow();
    expect(turn.claim(desk.send)).toBe(true);
    await settle();
    expect(turn.claim(desk.send)).toBe(true);
  });

  it('a claim made after the flush opens its own window', async () => {
    const turn = createTurnWindow();
    turn.claim(desk.send);
    await settle();
    expect(turn.claim(desk.send)).toBe(true);
    expect(turn.claim(desk.send)).toBe(false);
    await settle();
    expect(turn.claim(desk.send)).toBe(true);
  });
});

describe('forget — the teardown path', () => {
  it('a stopped watcher carries nothing over', () => {
    const turn = createTurnWindow();
    turn.claim(desk.send);
    turn.forget();
    expect(turn.claim(desk.send)).toBe(true);
  });
});
