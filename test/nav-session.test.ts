/**
 * NavSession — the D18 composition layer, tested at its meaning boundaries:
 * mount handles, overlay masking + auto-resume, the tab exclusivity prior,
 * evidence-based focus, dormancy, structure-swap world motion, instances.
 */
import { describe, expect, it } from 'vitest';
import { appMap } from '../src/index.js';
import type { AppMap, FireResult } from '../src/index.js';

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function shopMap(): AppMap {
  return appMap('shop', {
    pages: {
      catalog: {
        areas: {
          'filter-rail': { tools: { 'set-color': { does: 'Filter dresses by color', writes: ['color'] } } },
        },
        tools: { 'go-checkout': { does: 'Go to checkout', goTo: 'checkout' } },
      },
      checkout: {
        modals: {
          'confirm-order': { tools: { 'place-order': { does: 'Place the order', confirm: true } } },
        },
        tabs: {
          shipping: { tools: { 'save-address': { does: 'Save the shipping address' } } },
          payment: { tools: { 'save-card': { does: 'Save the payment card' } } },
        },
        tools: { 'edit-cart': { does: 'Edit the cart' } },
      },
      orders: {
        areas: {
          'order-card': {
            repeats: true,
            instances: (state) => (state['orderIds'] as string[]) ?? [],
            tools: { 'cancel-order': { does: 'Cancel this order' } },
          },
        },
      },
    },
  });
}

function served(session: { available(): { edges: { affordanceId: string }[] } }): string[] {
  return session.available().edges.map((edge) => edge.affordanceId).sort();
}

describe('mount — handles, handlers, mount-declared tools', () => {
  it('binds existing handlers by reference; fire executes them', async () => {
    const session = shopMap().createSession({ onWarn: () => undefined });
    let color: string | undefined;
    const handle = session.mount('catalog.filter-rail', {
      handlers: { 'set-color': (payload) => { color = (payload as { color: string }).color; } },
    });
    const fired = session.fire('catalog.filter-rail.set-color', {
      source: 'agent',
      payload: { color: 'red' },
    });
    expect(fired.ok).toBe(true);
    await tick();
    expect(color).toBe('red');
    handle.release();
  });

  it('mount-declared tools appear with descriptionSource registration and vanish on release', () => {
    const session = shopMap().createSession({ onWarn: () => undefined });
    const handle = session.mount('catalog.filter-rail', {
      tools: { 'clear-color': { does: 'Remove the color filter', handler: () => undefined } },
    });
    const edge = session.available().edges.find((e) => e.affordanceId === 'catalog.filter-rail.clear-color');
    expect(edge).toBeDefined();
    expect(edge!.descriptionSource).toBe('registration');
    handle.release();
    expect(served(session)).not.toContain('catalog.filter-rail.clear-color');
  });

  it('declared-wins: mount-declaring an appMap tool binds only the handler, with a warning', () => {
    const warnings: string[] = [];
    const session = shopMap().createSession({ onWarn: (message) => warnings.push(message) });
    session.mount('catalog.filter-rail', {
      tools: { 'set-color': { does: 'ATTACKER TEXT', handler: () => undefined } },
    });
    const edge = session.available().edges.find((e) => e.affordanceId === 'catalog.filter-rail.set-color')!;
    expect(edge.description).toBe('Filter dresses by color'); // the declaration wins
    expect(edge.materialized).toBe(true); // …but the handler bound
    expect(warnings.some((w) => w.includes('appMap declaration wins'))).toBe(true);
  });
});

describe('modal overlay — masking and auto-resume', () => {
  it('a mounted modal masks everything outside it; closing auto-resumes', () => {
    const session = shopMap().createSession({ node: 'checkout', onWarn: () => undefined });
    expect(served(session)).toEqual([
      'checkout.edit-cart',
      'checkout.payment.save-card',
      'checkout.shipping.save-address',
    ]); // modal closed: never assumed

    const modal = session.mount('checkout.confirm-order');
    expect(served(session)).toEqual(['checkout.confirm-order.place-order']);
    const blocked = session.fire('checkout.edit-cart', { source: 'agent' });
    expect(blocked).toMatchObject({ ok: false, reason: 'BLOCKED_BY_OVERLAY', overlay: 'checkout.confirm-order' });
    // the refusal is a gap-ledger row, typed
    expect(session.gaps().at(-1)).toMatchObject({ rejectionReason: 'BLOCKED_BY_OVERLAY' });

    modal.release();
    expect(served(session)).toContain('checkout.edit-cart'); // auto-resume, no history machinery
  });

  it('a modal is NEVER assumed active: firing into a closed modal is NODE_NOT_VISIBLE', () => {
    const session = shopMap().createSession({ node: 'checkout', onWarn: () => undefined });
    const fired = session.fire('checkout.confirm-order.place-order', { source: 'agent' });
    expect(fired).toMatchObject({ ok: false, reason: 'NODE_NOT_VISIBLE', node: 'checkout.confirm-order' });
  });

  it('an explicitly hidden modal (kept mounted for animation) does not mask', () => {
    const session = shopMap().createSession({ node: 'checkout', onWarn: () => undefined });
    session.mount('checkout.confirm-order', { visible: false }); // the one-line wire
    expect(served(session)).toContain('checkout.edit-cart');
  });
});

describe('tabs — the exclusivity prior, unions over guessed winners', () => {
  it('L0 (nothing mounted): both tabs serve as the flagged assumed union', () => {
    const session = shopMap().createSession({ node: 'checkout', onWarn: () => undefined });
    const edges = session.available().edges;
    const shipping = edges.find((e) => e.affordanceId === 'checkout.shipping.save-address')!;
    expect(shipping.activation).toBe('assumed');
    expect(shipping.presence).toBe('unknown');
  });

  it('one tab mounted: the sibling is really not there — NODE_NOT_VISIBLE', () => {
    const session = shopMap().createSession({ node: 'checkout', onWarn: () => undefined });
    session.mount('checkout.shipping');
    expect(served(session)).toContain('checkout.shipping.save-address');
    expect(served(session)).not.toContain('checkout.payment.save-card');
    const fired = session.fire('checkout.payment.save-card', { source: 'agent' });
    expect(fired).toMatchObject({ ok: false, reason: 'NODE_NOT_VISIBLE' });
  });

  it('both tabs mounted, no wire: flagged union + ONE dev warning naming show()', () => {
    const warnings: string[] = [];
    const session = shopMap().createSession({ node: 'checkout', onWarn: (m) => warnings.push(m) });
    session.mount('checkout.shipping');
    session.mount('checkout.payment');
    const edges = session.available().edges;
    expect(edges.find((e) => e.affordanceId === 'checkout.shipping.save-address')!.presence).toBe('unknown');
    expect(edges.find((e) => e.affordanceId === 'checkout.payment.save-card')!.presence).toBe('unknown');
    session.available(); // second look must not re-warn
    expect(warnings.filter((w) => w.includes('session.show'))).toHaveLength(1);
  });

  it('show() implements at-most-one-shown: the sibling flips hidden', () => {
    const session = shopMap().createSession({ node: 'checkout', onWarn: () => undefined });
    session.mount('checkout.shipping');
    session.mount('checkout.payment');
    session.show('checkout.shipping');
    const edges = session.available().edges;
    expect(edges.find((e) => e.affordanceId === 'checkout.shipping.save-address')!.activation).toBe('shown');
    expect(edges.find((e) => e.affordanceId === 'checkout.payment.save-card')).toBeUndefined();
    expect(session.fire('checkout.payment.save-card', { source: 'agent' })).toMatchObject({
      ok: false,
      reason: 'NODE_NOT_VISIBLE',
    });
  });
});

describe('STILL_MOUNTING — retriable, never a fake GUARD_FAILED', () => {
  it('mounts in use + assumed node + execution intent + no handler → retriable rejection', () => {
    const session = shopMap().createSession({ onWarn: () => undefined });
    session.mount('catalog'); // the page shell registered — presence is IN USE
    const fired = session.fire('catalog.filter-rail.set-color', { source: 'agent', payload: { color: 'red' } });
    expect(fired).toMatchObject({ ok: false, reason: 'STILL_MOUNTING', node: 'catalog.filter-rail' });
    // …the rail mounts a beat later, and the same call succeeds:
    session.mount('catalog.filter-rail', { handlers: { 'set-color': () => undefined } });
    expect(session.fire('catalog.filter-rail.set-color', { source: 'agent', payload: { color: 'red' } }).ok).toBe(true);
  });

  it('record-only fires (invoke:false, the DOM sensor) are never blocked by mounting', () => {
    const session = shopMap().createSession({ onWarn: () => undefined });
    session.mount('catalog');
    const fired = session.fire('catalog.filter-rail.set-color', {
      source: 'user',
      payload: { color: 'red' },
      invoke: false,
    });
    expect(fired.ok).toBe(true);
  });

  it('with NO mounts anywhere (pure L0), fires proceed exactly as v1', () => {
    const session = shopMap().createSession({ onWarn: () => undefined });
    expect(session.fire('catalog.filter-rail.set-color', { source: 'agent', payload: {} }).ok).toBe(true);
  });
});

describe('focus — sync/fire evidence only, ancestor fallback', () => {
  it('fire moves focus to the tool node; a masking modal walks it home; release restores it', () => {
    const session = shopMap().createSession({ node: 'checkout', onWarn: () => undefined });
    session.fire('checkout.shipping.save-address', { source: 'user' });
    expect(session.focus).toBe('checkout.shipping');

    const modal = session.mount('checkout.confirm-order');
    expect(session.focus).toBe('checkout'); // nearest active ancestor — never the modal (no fire evidence)
    modal.release();
    expect(session.focus).toBe('checkout.shipping'); // auto-resume for free

    session.sync('catalog');
    expect(session.focus).toBe('catalog'); // router evidence resets to the page
  });

  it('bare registration NEVER moves focus', () => {
    const session = shopMap().createSession({ node: 'checkout', onWarn: () => undefined });
    session.mount('checkout.payment');
    expect(session.focus).toBe('checkout');
  });
});

describe('dormancy + drift telemetry', () => {
  it('a mount outside the router page is dormant; past grace it becomes a sensor-drift gap row', () => {
    const warnings: string[] = [];
    const session = shopMap().createSession({
      node: 'checkout',
      dormantGraceMs: 0,
      onWarn: (m) => warnings.push(m),
    });
    session.mount('catalog.filter-rail', { handlers: { 'set-color': () => undefined } });
    expect(served(session)).not.toContain('catalog.filter-rail.set-color'); // held, not offered
    session.available(); // lazy drift check runs here (grace 0)
    expect(warnings.some((w) => w.includes('dormant'))).toBe(true);
    expect(session.gaps().some((gap) => gap.reason === 'sensor-drift')).toBe(true);
    // router confirms the page → instantly native, no re-mount needed
    session.sync('catalog');
    expect(served(session)).toContain('catalog.filter-rail.set-color');
  });
});

describe('structure-swap — presence flips are world motion; instance churn is not', () => {
  it('mount/unmount bumps version + structureVersion with one coalesced row', async () => {
    const session = shopMap().createSession({ onWarn: () => undefined });
    const version = session.version;
    session.mount('catalog.filter-rail');
    await tick();
    expect(session.version).toBe(version + 1);
    expect(session.structureVersion).toBe(1);
    expect(session.transitions().filter((t) => t.cause.stimulus === 'structure-swap')).toHaveLength(1);
  });

  it('instance mounts bump NOTHING global — a scrolling list cannot staleness-fail a plan', async () => {
    const session = shopMap().createSession({ node: 'orders', onWarn: () => undefined });
    const version = session.version;
    const card = session.mount('orders.order-card', { instance: 'o-1' });
    session.mount('orders.order-card', { instance: 'o-2' });
    card.release();
    await tick();
    expect(session.version).toBe(version);
    expect(session.transitions()).toHaveLength(0);
  });
});

describe('repeats — one parameterized tool, instance keys as data', () => {
  it('fire without an instance → INSTANCE_REQUIRED with the known keys', () => {
    const session = shopMap().createSession({ node: 'orders', state: { orderIds: ['o-1', 'o-2'] } });
    const fired = session.fire('orders.order-card.cancel-order', { source: 'agent' });
    expect(fired).toMatchObject({ ok: false, reason: 'INSTANCE_REQUIRED', instances: ['o-1', 'o-2'] });
  });

  it('the selector owns existence (L2): scrolled-out instances are fireable; unknown ones are not', () => {
    const session = shopMap().createSession({ node: 'orders', state: { orderIds: ['o-1', 'o-2'] } });
    const edge = session.available().edges.find((e) => e.affordanceId === 'orders.order-card.cancel-order')!;
    expect(edge.instances).toEqual(['o-1', 'o-2']);
    expect(edge.enumeration).toBe('selector');
    expect(session.fire('orders.order-card.cancel-order', { source: 'agent', instance: 'o-2' }).ok).toBe(true);
    expect(session.fire('orders.order-card.cancel-order', { source: 'agent', instance: 'ghost' })).toMatchObject({
      ok: false,
      reason: 'INSTANCE_UNKNOWN',
    });
  });

  it('without a selector, the mounted window serves — marked as partial knowledge', () => {
    const map = appMap('list', {
      pages: {
        inbox: {
          areas: {
            row: { repeats: true, tools: { archive: { does: 'Archive this row' } } },
          },
        },
      },
    });
    const session = map.createSession({ onWarn: () => undefined });
    session.mount('inbox.row', { instance: 'm-1' });
    const edge = session.available().edges[0];
    expect(edge.instances).toEqual(['m-1']);
    expect(edge.enumeration).toBe('mounted-window');
  });

  it('per-instance handlers: the card mounts its own closure; fire routes by instance key', async () => {
    const session = shopMap().createSession({ node: 'orders', state: { orderIds: ['o-1', 'o-2'] } });
    const cancelled: string[] = [];
    session.mount('orders.order-card', {
      instance: 'o-1',
      handlers: { 'cancel-order': () => { cancelled.push('o-1'); } },
    });
    session.fire('orders.order-card.cancel-order', { source: 'agent', instance: 'o-1' });
    await tick();
    expect(cancelled).toEqual(['o-1']);
  });
});

describe('contextBrief — focus and frontier lines', () => {
  it('renders focus and the mounted frontier under the current page', () => {
    const session = shopMap().createSession({ node: 'checkout', onWarn: () => undefined });
    session.mount('checkout.shipping');
    session.fire('checkout.shipping.save-address', { source: 'user' });
    const brief = session.contextBrief();
    expect(brief.text).toContain('Focus: checkout.shipping.');
    expect(brief.text).toContain('Mounted here: checkout.shipping.');
  });
});

function isOk(result: FireResult): result is Extract<FireResult, { ok: true }> {
  return result.ok;
}
void isOk;
