/**
 * ARRIVAL — the claim and the observation, joined where they meet.
 *
 * A navigating action declares no writes, so from the element's side success
 * looks exactly like nothing happening. The library has always recorded the
 * CLAIM (`toNodeClaimed`) and, separately, the OBSERVATION (`sync()`), and never
 * put the two in the same sentence: an agent asking "did it work" about a
 * navigation was handed a receipt that could not speak to the only evidence
 * there is. `arrival` is that join, and it has exactly two values.
 *
 * WHAT IT IS NOT, and every one of these is a test below:
 * - not a timeout ("no sync within N ms ⇒ failed"): silence stays 'claimed';
 * - not a receipt rewrite: the settlement taken at rest still says 'claimed',
 *   and `toNodeClaimed` is never flipped back;
 * - not fuzzy matching: '/shop/checkout' and '/checkout-old' corroborate
 *   nothing, and a param route never outbids a more literal one;
 * - not causal proof: the sync row that produced it still carries
 *   `unverifiedEdge: true`, and the served sentence says so in words.
 *
 * MUTATION PROOFS:
 * - stamp 'observed' on a sync anywhere and 'a sync somewhere else' goes red;
 * - match with endsWith and two of the fuzzy cases go red;
 * - upgrade the settlement's own copy and 'the receipt is never rewritten' goes
 *   red with the rewritten receipt in hand;
 * - open the window at SETTLE instead of at the fire and four go red: the late
 *   settle, the settle-order inversion, the in-flight observation, and the
 *   unmaterialized fire that must never be corroborated.
 */
import { describe, expect, it, vi } from 'vitest';
import { skillGraph, skillsAsTools } from '../src/index.js';
import type { Session, TransitionRecord } from '../src/index.js';
import { shop, initialState, wire } from './fixture.js';

/** The live record for a transition id (never the settlement's frozen copy). */
function live(session: Session, id: string): TransitionRecord {
  return session.transitions().find((row) => row.id === id)!;
}

/** A session standing on the catalog with a cart, wired so an agent can really act. */
function cartReady(): Session {
  const session = shop().createSession({
    node: 'catalog',
    state: { ...initialState, authenticated: true, cartCount: 2 },
    onWarn: () => undefined,
  });
  wire(session, 'go-to-cart', 'add-to-cart', 'proceed-to-checkout', 'open-help');
  return session;
}

/** A two-page graph whose one action is a TAB flip, with or without a declared destination. */
function tabApp(opts?: { declaresDestination?: boolean }) {
  return skillGraph('app', { description: 'Tabs' })
    .page('settings')
    .page('billing')
    .affordance('open-billing-tab', {
      on: 'settings',
      description: 'Switch to the billing tab',
      binding: { kind: 'tab', target: 'billing' },
      ...(opts?.declaresDestination === false ? {} : { effect: { navigatesTo: 'billing' } }),
    })
    .build();
}

/**
 * A state-TAPPED session whose one navigating action also writes — so it settles
 * on the app's report and not on its own stack. That gap between firing and
 * settling is where the window's ordering can be told apart from the record's.
 */
function orderDesk(): Session {
  const graph = skillGraph('orders', { description: 'An order desk' })
    .page('cart')
    .page('confirmation')
    .page('search')
    .affordance('place', {
      on: 'cart',
      description: 'Place the order',
      binding: { kind: 'element', locator: { role: 'button', name: 'Place order' }, actuation: 'click' },
      effect: { navigatesTo: 'confirmation', writes: ['orderId'] },
    })
    .affordance('place-express', {
      on: 'cart',
      description: 'Place the order with express delivery',
      binding: { kind: 'element', locator: { role: 'button', name: 'Express' }, actuation: 'click' },
      effect: { navigatesTo: 'confirmation', writes: ['expressId'] },
    })
    .affordance('note', {
      on: ['cart', 'confirmation', 'search'],
      description: 'Note something down',
      binding: { kind: 'element', locator: { role: 'button', name: 'Note' }, actuation: 'click' },
    })
    .build();
  const session = graph.createSession({ node: 'cart', state: {}, onWarn: () => undefined });
  wire(session, 'place', 'place-express', 'note');
  return session;
}

/** Fire the catalog's navigating edge, let it come to rest, hand back its id. */
async function goToCart(session: Session): Promise<string> {
  const fired = session.fire('go-to-cart', { source: 'agent' });
  if (!fired.ok) throw new Error(`go-to-cart was refused: ${JSON.stringify(fired)}`);
  await fired.whenSettled; // the handler's own microtask — the receipt exists after this
  return fired.transition.id;
}

describe('the claim is stamped, and only where a page can be arrived at', () => {
  it("a navigating fire stamps arrival 'claimed' — the app SAID it, nobody has seen it", async () => {
    const session = cartReady();
    const id = await goToCart(session);
    expect(live(session, id)).toMatchObject({
      toNode: 'cart',
      toNodeClaimed: true,
      arrival: 'claimed',
    });
  });

  it('a fire that declares no navigation carries no arrival at all', async () => {
    const session = cartReady();
    const fired = session.fire('add-to-cart', { source: 'agent', payload: { productId: 'p1' } });
    expect(fired.ok).toBe(true);
    if (!fired.ok) return;
    session.updateState({ cart: ['p1'], cartCount: 3 });
    expect(live(session, fired.transition.id).arrival).toBeUndefined();
    // …and neither does a stimulus row: nothing claimed anything.
    const synced = session.sync('cart');
    expect(synced.changed && synced.transition.arrival).toBeUndefined();
  });

  it('a TAB gesture that declares a destination gets one — the cursor really moves', async () => {
    // THE ASYMMETRY THIS PINS. A tab-bound edge with `effect.navigatesTo` moves
    // the page cursor exactly like any other declared hop — that has always been
    // true, whatever the gesture. Excluding tabs from the claim would leave a
    // session whose cursor moved on the app's word with nothing able to
    // corroborate it: a hop that happened and can never be spoken about. The
    // gesture is how it is performed; the declaration is what it claims.
    const graph = tabApp();
    const session = graph.createSession({ node: 'settings', onWarn: () => undefined });
    wire(session, 'open-billing-tab');
    const fired = session.fire('open-billing-tab', { source: 'agent' });
    expect(fired.ok).toBe(true);
    if (!fired.ok) return;
    const record = live(session, fired.transition.id);
    expect(record.toNodeClaimed).toBe(true); // the existing claim law is untouched
    expect(record.arrival).toBe('claimed');
    expect(session.node).toBe('billing'); // …and this is why the claim is minted
    // …and the app's own confirmation corroborates it, like any other hop.
    session.sync('billing', { stimulus: 'navigation' });
    expect(live(session, fired.transition.id).arrival).toBe('observed');
  });

  it('a TAB gesture that declares NOTHING gets no claim and moves no cursor', () => {
    // The other half of the same law: without `navigatesTo` the tab flip is
    // descriptive, exactly as the Binding doc says — no hop, so nothing to claim.
    const graph = tabApp({ declaresDestination: false });
    const session = graph.createSession({ node: 'settings', onWarn: () => undefined });
    wire(session, 'open-billing-tab');
    const fired = session.fire('open-billing-tab', { source: 'agent' });
    expect(fired.ok).toBe(true);
    if (!fired.ok) return;
    expect(live(session, fired.transition.id).arrival).toBeUndefined();
    expect(session.node).toBe('settings');
  });

  it('an UNMATERIALIZED fire claims, and can never be corroborated', async () => {
    // Nothing executed it, so there is no navigation for an observation to be
    // evidence of — and a human wandering to that page later must not upgrade a
    // no-op into "a matching observation landed". It says 'claimed' forever,
    // beside `materialized: false`.
    const session = shop().createSession({
      node: 'catalog',
      state: { ...initialState, authenticated: true, cartCount: 2 },
      allowUnmaterializedFires: true,
      onWarn: () => undefined,
    });
    const fired = session.fire('go-to-cart', { source: 'agent' });
    expect(fired.ok).toBe(true);
    if (!fired.ok) return;
    expect(fired.materialized).toBe(false);
    await fired.whenSettled;
    expect(live(session, fired.transition.id).arrival).toBe('claimed');
    session.sync('cart', { stimulus: 'navigation' });
    expect(live(session, fired.transition.id).arrival).toBe('claimed');
  });
});

describe('the observation joins it — exactly, or by the route table, and never by resemblance', () => {
  it("the app's own confirmation upgrades the claim to 'observed'", async () => {
    const session = cartReady();
    const id = await goToCart(session);
    expect(session.node).toBe('cart'); // the claim moved the cursor optimistically
    // The router confirms the page the claim already moved to — a sync that
    // changes nothing, and the only moment that corroborates the claim.
    const confirmed = session.sync('cart', { stimulus: 'navigation' });
    expect(confirmed.changed).toBe(false);
    expect(live(session, id).arrival).toBe('observed');
  });

  it('a RAW PATHNAME is read through the route table — what watchLocation actually reports', async () => {
    const session = cartReady();
    const id = await goToCart(session);
    // The sensor syncs raw pathnames and deliberately never applies matchRoute,
    // so the cursor follows the path off-graph exactly as it does today…
    const observed = session.sync('/cart', { stimulus: 'navigation' });
    expect(observed).toMatchObject({ changed: true, offGraph: true, node: '/cart' });
    // …and the join still reads it, because '/cart' is the route the claimed
    // page declared. Segment reading, never string resemblance.
    expect(live(session, id).arrival).toBe('observed');
  });

  it('a sync SOMEWHERE ELSE leaves the claim standing — no verdict either way', async () => {
    const session = cartReady();
    const id = await goToCart(session);
    session.sync('checkout', { stimulus: 'navigation' });
    expect(live(session, id).arrival).toBe('claimed');
    // And it is not "failed" by a later hop back, either: the window is closed,
    // and a claim nobody corroborated simply stays a claim.
    session.sync('cart', { stimulus: 'navigation' });
    expect(live(session, id).arrival).toBe('claimed');
  });

  it('resemblance is not arrival: a longer path, a suffix match, and a near-miss all refuse', async () => {
    for (const path of ['/shop/cart', '/cart/17', '/cart-old', 'carts']) {
      const session = cartReady();
      const id = await goToCart(session);
      session.sync(path, { stimulus: 'navigation' });
      expect(live(session, id).arrival, `'${path}' must not corroborate 'cart'`).toBe('claimed');
    }
  });

  it('a param route never outbids a more literal one — the whole table is asked', async () => {
    const graph = skillGraph('orders', { description: 'Orders' })
      .page('orders', { route: '/orders' })
      .page('orderDetail', { route: '/orders/:id' })
      .page('newOrder', { route: '/orders/new' })
      .affordance('open-order', {
        on: 'orders',
        description: 'Open an order',
        binding: { kind: 'element', locator: { role: 'link', name: 'Order' }, actuation: 'click' },
        effect: { navigatesTo: 'orderDetail' },
      })
      .build();

    const wandered = graph.createSession({ node: 'orders', onWarn: () => undefined });
    wire(wandered, 'open-order');
    const wanderedId = (() => {
      const fired = wandered.fire('open-order', { source: 'agent' });
      return fired.ok ? fired.transition.id : '';
    })();
    // '/orders/new' is described exactly by newOrder and only loosely by the
    // claimed page's ':id'. The matcher gives it to the literal route, so the
    // claim finds nothing — which is the truth: the app went somewhere else.
    wandered.sync('/orders/new', { stimulus: 'navigation' });
    expect(live(wandered, wanderedId).arrival).toBe('claimed');

    const arrived = graph.createSession({ node: 'orders', onWarn: () => undefined });
    wire(arrived, 'open-order');
    const arrivedId = (() => {
      const fired = arrived.fire('open-order', { source: 'agent' });
      return fired.ok ? fired.transition.id : '';
    })();
    arrived.sync('/orders/77', { stimulus: 'navigation' });
    expect(live(arrived, arrivedId).arrival).toBe('observed');
  });
});

describe('the window is one claim wide', () => {
  it('two fires claiming the same page: only the NEWEST can be corroborated', async () => {
    const graph = skillGraph('app', { description: 'Two doors, one room' })
      .page('home')
      .page('target')
      .affordance('go', {
        on: ['home', 'target'],
        description: 'Go to the target page',
        binding: { kind: 'element', locator: { role: 'link', name: 'Go' }, actuation: 'click' },
        effect: { navigatesTo: 'target' },
      })
      .build();
    const session = graph.createSession({ node: 'home', onWarn: () => undefined });
    wire(session, 'go');

    const first = session.fire('go', { source: 'agent' });
    const second = session.fire('go', { source: 'agent' });
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;

    session.sync('target', { stimulus: 'navigation' });
    // ONE observation cannot corroborate two claims, and picking the older by
    // recency would answer about a fire the caller may not have meant.
    expect(live(session, first.transition.id).arrival).toBe('claimed');
    expect(live(session, second.transition.id).arrival).toBe('observed');
  });

  it('any later FIRE closes the window — two candidates, no way to tell which moved the app', async () => {
    const session = cartReady();
    const id = await goToCart(session);
    // 'open-help' lives on the cart and navigates nowhere, but it IS an action
    // somebody performed between the claim and the observation.
    expect(session.fire('open-help', { source: 'agent' }).ok).toBe(true);
    session.sync('cart', { stimulus: 'navigation' });
    expect(live(session, id).arrival).toBe('claimed');
  });

  it('a LATE settle cannot re-open a window that a later fire already closed', () => {
    // The ordinary "place the order → confirmation" shape: a fire that both
    // navigates and writes, on a state-tapped session, so it settles when the app
    // REPORTS — long after it fired. The window's closers run in fire order, so
    // an opener that ran at settle re-opened one that had already closed, and a
    // wholly unrelated later observation then read as corroboration.
    const session = orderDesk();
    const placed = session.fire('place', { source: 'agent' });
    expect(placed.ok && placed.settlement).toBe('awaiting-state');
    if (!placed.ok) return;
    session.fire('note', { source: 'agent' }); // another fire: the window closes here
    session.sync('search', { stimulus: 'navigation' }); // and a contradiction closes it again
    session.updateState({ orderId: 'o-1' }); // NOW the nav fire settles
    session.sync('confirmation', { stimulus: 'navigation' });
    expect(live(session, placed.transition.id).arrival).toBe('claimed');
  });

  it('two rapid fires: the newest holds the window even when the OLDER settles last', () => {
    // Settle order is not fire order — two doors to one page, and the second
    // one's report lands first. The window belongs to the fire that happened
    // last, which is what the record's own doc promises ("the older keeps
    // 'claimed'"). Opened at settle, the LATE-settling older fire took the window
    // and one observation corroborated the wrong one.
    const session = orderDesk();
    const first = session.fire('place', { source: 'agent' });
    const second = session.fire('place-express', { source: 'agent' });
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    session.updateState({ expressId: 'x-1' }); // the NEWER fire settles first
    session.updateState({ orderId: 'o-1' }); // …and the older one settles late
    session.sync('confirmation', { stimulus: 'navigation' });
    expect(live(session, first.transition.id).arrival).toBe('claimed');
    expect(live(session, second.transition.id).arrival).toBe('observed');
  });

  it('an observation that lands BEFORE the fire settles still corroborates it', () => {
    // The ordinary real-world order: the router moves, and the promise resolves
    // afterwards. The claim is stamped at settle and must not overwrite the
    // corroboration that arrived first.
    const session = orderDesk();
    const placed = session.fire('place', { source: 'agent' });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    session.sync('confirmation', { stimulus: 'navigation' });
    session.updateState({ orderId: 'o-1' });
    expect(live(session, placed.transition.id).arrival).toBe('observed');
  });
});

describe('silence is never a verdict', () => {
  it('no sync at all — and no amount of waiting — ever turns a claim into a failure', async () => {
    vi.useFakeTimers();
    try {
      const session = cartReady();
      const id = await goToCart(session);
      vi.advanceTimersByTime(10 * 60 * 1000); // ten minutes of nothing happening
      await vi.advanceTimersByTimeAsync(0);
      const record = live(session, id);
      expect(record.arrival).toBe('claimed');
      expect(record.outcome).toBe('committed');

      // …and the served answer says nothing about failing, either.
      const port = skillsAsTools(session);
      const answer = port.call('shop.did_it_work', { transitionId: id });
      expect(answer['arrival']).toBe('claimed');
      expect(JSON.stringify(answer).toLowerCase()).not.toContain('timed out');
    } finally {
      vi.useRealTimers();
    }
  });

  it('a session with NO sync channel keeps its claims forever — honest, not stuck', async () => {
    const session = cartReady();
    const id = await goToCart(session);
    session.updateState({ cartCount: 2 }); // the app reports state, never position
    expect(live(session, id).arrival).toBe('claimed');
  });
});

describe('the upgrade rides ALONGSIDE — nothing already written is rewritten', () => {
  it('the settlement receipt taken at rest still says claimed; the live record says observed', async () => {
    const session = cartReady();
    const id = await goToCart(session);
    session.sync('cart', { stimulus: 'navigation' });

    // MUTATION PROOF: #effectSnapshot copies the record at rest. Hand out the
    // live record instead and this receipt starts saying 'observed' — a receipt
    // rewritten after the fact, which is the one thing the answer grammar forbids.
    expect(session.settlementIfKnown(id)!.transition.arrival).toBe('claimed');
    expect(live(session, id).arrival).toBe('observed');
  });

  it('toNodeClaimed is never retroactively flipped, and the sync row stays unverified', async () => {
    const session = cartReady();
    const id = await goToCart(session);
    const observed = session.sync('cart', { stimulus: 'navigation' });
    expect(observed.changed).toBe(false); // the claim had already moved the cursor

    const record = live(session, id);
    expect(record.toNodeClaimed).toBe(true); // still a claim: nothing here saw the router
    expect(record.arrival).toBe('observed');

    // The corroborating hop, when it IS a hop, remains an unverified edge.
    const elsewhere = cartReady();
    const otherId = await goToCart(elsewhere);
    const hop = elsewhere.sync('/cart', { stimulus: 'navigation' });
    expect(hop.changed && hop.transition.unverifiedEdge).toBe(true);
    expect(live(elsewhere, otherId).arrival).toBe('observed');
  });

  it('the join re-emits the record and bumps NO version — a record annotation is not world motion', async () => {
    const session = cartReady();
    const id = await goToCart(session);
    const seen: Array<{ id: string; arrival?: string }> = [];
    session.on('transition', (record) => seen.push({ id: record.id, arrival: record.arrival }));

    const before = session.version;
    session.sync('cart', { stimulus: 'navigation' });
    expect(session.version).toBe(before); // the sync itself changed nothing either
    expect(seen).toEqual([{ id, arrival: 'observed' }]);
  });
});

describe('did_it_work serves it beside the receipt, never as the verdict', () => {
  it("a corroborated navigation reads 'observed' — and says that is not proof", async () => {
    const session = cartReady();
    const id = await goToCart(session);
    session.sync('cart', { stimulus: 'navigation' });

    const answer = skillsAsTools(session).call('shop.did_it_work', { transitionId: id });
    expect(answer).toMatchObject({ ok: true, settled: true, arrival: 'observed', toNode: 'cart' });
    expect(String(answer['arrivalMeans'])).toContain('corroboration, not proof');
    // The three settlement axes are untouched: arrival is a fourth fact, not a
    // fifth opinion about them.
    expect(answer['effectStatus']).toBe('performed');
    expect(answer['effectVerified']).toBe('unobservable');
  });

  it("an uncorroborated one reads 'claimed' — and says that is not a failure", async () => {
    const session = cartReady();
    const id = await goToCart(session);
    const answer = skillsAsTools(session).call('shop.did_it_work', { transitionId: id });
    expect(answer['arrival']).toBe('claimed');
    expect(String(answer['arrivalMeans'])).toContain('That is not a failure');
  });

  it('an action that declares no navigation is served no arrival field at all', async () => {
    const session = cartReady();
    const fired = session.fire('add-to-cart', { source: 'agent', payload: { productId: 'p1' } });
    expect(fired.ok).toBe(true);
    if (!fired.ok) return;
    session.updateState({ cart: ['p1'], cartCount: 3 });
    await fired.whenSettled;

    const answer = skillsAsTools(session).call('shop.did_it_work', {
      transitionId: fired.transition.id,
    });
    expect(answer['settled']).toBe(true);
    expect('arrival' in answer).toBe(false);
    expect('arrivalMeans' in answer).toBe(false);
  });
});
