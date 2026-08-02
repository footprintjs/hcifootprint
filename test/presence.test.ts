/**
 * PresenceIndex — the pure presence sensor: refcounted handles, explicit
 * visibility signals, and a fingerprint that deliberately ignores instance
 * churn (a scrolling list must never look like world motion).
 */
import { describe, expect, it } from 'vitest';
import { PresenceIndex } from '../src/index.js';

describe('what is on the screen right now — counted, never inferred', () => {
  it('refcounts node handles; release is idempotent per handle (StrictMode-safe)', () => {
    const index = new PresenceIndex();
    const first = index.open('a.b');
    const second = index.open('a.b');
    expect(index.isPresent('a.b')).toBe(true);
    first.release();
    first.release(); // double-release must not steal the second handle's count
    expect(index.isPresent('a.b')).toBe(true);
    second.release();
    expect(index.isPresent('a.b')).toBe(false);
    expect(index.hasAnyHandles()).toBe(false);
  });

  it('instance handles track the mounted window without making the node "present"', () => {
    const index = new PresenceIndex();
    const card = index.open('orders.card', 'o-1');
    index.open('orders.card', 'o-2');
    expect(index.instancesOf('orders.card').sort()).toEqual(['o-1', 'o-2']);
    expect(index.hasInstance('orders.card', 'o-1')).toBe(true);
    expect(index.isPresent('orders.card')).toBe(false); // node presence = NODE handles only
    card.release();
    expect(index.instancesOf('orders.card')).toEqual(['o-2']);
  });

  it('refcounts each CARD of a repeats node separately, so one unmount does not empty the row', () => {
    const index = new PresenceIndex();
    const first = index.open('orders.card', 'o-1');
    index.open('orders.card', 'o-1'); // the same card, mounted twice (StrictMode)
    first.release();
    expect(index.hasInstance('orders.card', 'o-1')).toBe(true);
  });

  it('answers about a node nobody ever mounted a card of, instead of throwing', () => {
    const index = new PresenceIndex();
    expect(index.instancesOf('orders.card')).toEqual([]);
    expect(index.hasInstance('orders.card', 'o-1')).toBe(false);
    // …and about a node that has cards, but not the one asked about.
    index.open('orders.card', 'o-1');
    expect(index.hasInstance('orders.card', 'o-2')).toBe(false);
  });

  it('visibility is an explicit signal store — undefined until someone says', () => {
    const index = new PresenceIndex();
    expect(index.visibility('x')).toBeUndefined();
    index.setVisible('x', false);
    expect(index.visibility('x')).toBe(false);
  });

  it('the fingerprint covers node presence + visibility and EXCLUDES instance churn', () => {
    const index = new PresenceIndex();
    const before = index.fingerprint();
    const instance = index.open('list.card', 'k-1');
    expect(index.fingerprint()).toBe(before); // scrolling is not world motion
    instance.release();

    const node = index.open('list');
    expect(index.fingerprint()).not.toBe(before);
    node.release();
    index.setVisible('modal', true);
    expect(index.fingerprint()).toContain('modal=1');
  });
});
