/**
 * The anchor watcher and its port, on their own — the edges a session-level test
 * cannot reach because the session never asks for them.
 *
 * Everything here is about what the watcher does when the world is not tidy: a
 * stopped watcher that still gets an event, a window closed twice, a target the
 * port cannot name at all, a host with no view. Each of those has one honest
 * answer, and each answer is small enough that only a direct test can see it.
 */
import { describe, expect, it, vi } from 'vitest';
import { watchAnchor } from '../src/contextful/anchor.js';
import {
  anchorNode,
  nameOf,
  observerCtorOf,
  resolveAnchor,
} from '../src/contextful/anchor-port.js';
import type { AnchorElement, AnchorSource } from '../src/contextful/anchor-port.js';
import type { SensedChange, SensedSummary } from '../src/index.js';
import { AnchorHost, FakeAnchor, attribute, node, removed } from './contextful-fixture.js';

/** A watcher over a fresh anchor, with the summaries it delivers collected. */
function watching(options?: { expect?: Parameters<typeof watchAnchor>[1]['expect'] }) {
  const host = new AnchorHost();
  const anchor = new FakeAnchor(host);
  const summaries: SensedSummary[] = [];
  const warnings: string[] = [];
  const watch = watchAnchor(anchor, {
    now: () => 1,
    warn: (message) => warnings.push(message),
    ...(options?.expect !== undefined ? { expect: options.expect } : {}),
  });
  return { anchor, host, watch, summaries, warnings };
}

describe('a stopped watcher is inert', () => {
  it('releases its listeners and its observer, and a second stop finds nothing to do', () => {
    const { anchor, host, watch } = watching();
    expect(anchor.listenerCount).toBe(3);

    watch.stop();
    watch.stop();

    expect(anchor.listenerCount).toBe(0);
    expect(host.connected).toBe(0);
  });

  it('ignores an event still in flight when it stopped', () => {
    const { anchor, watch, summaries } = watching();
    // A dispatch the host had already begun: the DOM hands a listener its event
    // even as the page tears down around it.
    const listener = anchor.entries.find((entry) => entry.type === 'click')!.listener;
    watch.stop();

    listener({ type: 'click', target: node('button'), isTrusted: true });
    watch.open();
    watch.close((summary) => summaries.push(summary));

    expect(summaries).toHaveLength(0);
  });
});

describe('the window', () => {
  it('is a no-op to close when none is open, and to close twice', async () => {
    const { watch, summaries } = watching();

    watch.close((summary) => summaries.push(summary));
    watch.open();
    watch.close((summary) => summaries.push(summary));
    watch.close(() => summaries.push({} as SensedSummary));
    await Promise.resolve();

    expect(summaries).toHaveLength(1);
  });

  it('finalizes an unfinished window when the next act opens its own', () => {
    const { watch, summaries } = watching();

    watch.open();
    watch.close((summary) => summaries.push(summary)); // still pending its turn hop
    watch.open(); // …and a new act arrives first

    expect(summaries).toHaveLength(1);
  });
});

describe('what a change is called', () => {
  it('names a REMOVAL, an attribute by name, and text', async () => {
    const seen: SensedChange[] = [];
    const { watch, host, summaries } = watching({
      expect: {
        name: 'anything',
        matches: (change) => {
          seen.push(change);
          return false;
        },
      },
    });

    watch.open();
    host.mutate(removed(), attribute('aria-expanded'), { type: 'characterData', target: node('p') });
    watch.close((summary) => summaries.push(summary));
    await Promise.resolve();

    expect(seen.map((change) => change.kind)).toEqual(['removed', 'attribute', 'text']);
    expect(seen[1]).toMatchObject({ attribute: 'aria-expanded', targetTag: 'div' });
    expect(summaries[0]?.changes).toBe(3);
  });

  it('carries no attribute name when the record has none to give', async () => {
    const seen: SensedChange[] = [];
    const { watch, host, summaries } = watching({
      expect: { name: 'anything', matches: (change) => (seen.push(change), false) },
    });

    watch.open();
    host.mutate({ type: 'attributes', target: node('div'), attributeName: null });
    watch.close((summary) => summaries.push(summary));
    await Promise.resolve();

    expect(seen[0]).toEqual({ kind: 'attribute', targetTag: 'div', at: 1 });
  });

  it('reads a bare childList record as an ADDITION — removal is the claim that needs evidence', async () => {
    const seen: SensedChange[] = [];
    const { watch, host, summaries } = watching({
      expect: { name: 'anything', matches: (change) => (seen.push(change), false) },
    });

    watch.open();
    host.mutate(
      { type: 'childList', target: node('li') }, // neither list handed over
      { type: 'childList', target: node('li'), removedNodes: { length: 1 } }, // one of the two
    );
    watch.close((summary) => summaries.push(summary));
    await Promise.resolve();

    expect(seen.map((change) => change.kind)).toEqual(['added', 'removed']);
  });
});

describe('the port answers absence honestly', () => {
  it('resolves an anchor from an element, a getter, or nothing at all', () => {
    const anchor = new FakeAnchor();
    expect(resolveAnchor(undefined)).toBeUndefined();
    expect(resolveAnchor(anchor as unknown as AnchorElement)).toBe(anchor);
    expect(resolveAnchor((() => null) as AnchorSource)).toBeUndefined();
  });

  it('finds no observer where the host publishes none', () => {
    const withoutView = { ownerDocument: null } as unknown as AnchorElement;
    const withNullView = { ownerDocument: { defaultView: null } } as unknown as AnchorElement;
    const withoutCtor = { ownerDocument: { defaultView: {} } } as unknown as AnchorElement;

    expect(observerCtorOf(withoutView)).toBeUndefined();
    expect(observerCtorOf(withNullView)).toBeUndefined();
    expect(observerCtorOf(withoutCtor)).toBeUndefined();
  });

  it('names what it can and stays silent about what it cannot', () => {
    expect(anchorNode('a string')).toBeUndefined();
    expect(nameOf(null)).toEqual({});
    expect(nameOf({})).toEqual({}); // no tag, no getAttribute: nothing to say
    expect(nameOf({ tagName: 'BUTTON' })).toEqual({ targetTag: 'button' });
    expect(nameOf(node('div', { role: '  dialog  ' }))).toEqual({
      targetRole: 'dialog',
      targetTag: 'div',
    });
    // A BLANK role attribute is absence, not a control called nothing.
    expect(nameOf(node('div', { role: '   ' }))).toEqual({ targetTag: 'div' });
    expect(nameOf({ tagName: '  ', getAttribute: () => null })).toEqual({});
  });

  it('an observer is connected to the anchor’s own subtree', () => {
    const { host } = watching();
    expect(host.observers[0]?.init).toEqual({
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });
  });

  it('a stimulus listener is only called for what nobody claimed', async () => {
    const host = new AnchorHost();
    const anchor = new FakeAnchor(host);
    const onStimulus = vi.fn();
    const watch = watchAnchor(anchor, { now: () => 1, warn: () => {}, onStimulus });

    watch.open();
    anchor.dispatch({ type: 'input', target: node('input'), isTrusted: true });
    watch.close(() => {});
    await Promise.resolve();

    expect(onStimulus).not.toHaveBeenCalled();
    watch.stop();
  });
});
