/**
 * A REACH FOR AN ACTION THIS POSITION CANNOT SERVE — what Mode B says back.
 *
 * `do_action` resolves a name against the SERVED edges, so a name that matches
 * none of them is refused by the port itself: no `fire()` runs, and therefore
 * nothing lands in the gap ledger or the facts block (the boundary is pinned at
 * the bottom of this file, and stated on the Ground truth page).
 *
 * The audit that found that boundary found the sharper edge of it first: the
 * refusal said `UNKNOWN_ACTION` about actions the app plainly HAS — a step
 * whose guard is closed, a control on the next page. To a model that read the
 * action's own name out of a result one turn earlier, "unknown" is not a
 * teaching refusal, it is a contradiction, and the moves it leaves are to
 * report the control missing or to reach again.
 *
 * The typed `reason` is untouched (0.4/0.5 consumers branch on it). What the
 * refusal gained is the truth the session already held: `explain()`'s answer,
 * in `explain()`'s own evidence.
 *
 * Mutation proofs: before this change every assertion on `why` below fails —
 * the key was absent on all four arms — and the two arms that must stay silent
 * (a name the graph really lacks, an ambiguous short name) would start
 * inventing an explanation if the guards around them were dropped.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph, serveToAgent } from '../src/index.js';
import type { InteractionSession } from '../src/index.js';

/** A two-step wizard: Next is guarded, Finish lives on the other page. */
function wizard(state: Record<string, unknown> = { name: '' }): {
  session: InteractionSession;
  port: ReturnType<typeof serveToAgent>;
} {
  const session = buildNavigationGraph('wizard', {
    pages: {
      step1: {
        actions: {
          'set-name': { does: 'Set the name', writes: ['name'] },
          next: { does: 'Go to step 2', when: { name: { ne: '' } }, goTo: 'step2' },
          // TWO conditions, one of them about a key no state view here holds.
          upgrade: { does: 'Upgrade the plan', when: { name: { ne: '' }, plan: { eq: 'pro' } } },
        },
      },
      step2: { actions: { finish: { does: 'Finish the wizard' } } },
    },
  }).createSession({ node: 'step1', state, onWarn: () => undefined });
  session.registerActions('step1', {
    handlers: { 'set-name': () => undefined, next: () => undefined, upgrade: () => undefined },
  });
  return { session, port: serveToAgent(session) };
}

describe('the refusal names which true thing is the case', () => {
  it('a guard-closed action on THIS page: the conditions, with the evidence', () => {
    const { port } = wizard();
    const refused = port.call('wizard.do_action', { action: 'step1.next' });

    // Unchanged, field for field — a released consumer branches on these.
    expect(refused).toMatchObject({ ok: false, judgment: 'error', reason: 'UNKNOWN_ACTION' });
    expect(refused['actions']).toEqual(['step1.set-name']);

    expect(refused['why']).toContain('does have that action and it belongs on this page');
    expect(refused['why']).toContain('conditions are not met');
    // The same per-condition evidence a GUARD_FAILED fire carries.
    expect(refused['evidence']).toEqual([
      { key: 'name', op: 'ne', threshold: '', actualSummary: '""', result: false, redacted: false },
    ]);
  });

  it('an action the app has on ANOTHER page: said as position, with no evidence', () => {
    const { port } = wizard();
    const refused = port.call('wizard.do_action', { action: 'step2.finish' });

    expect(refused).toMatchObject({ ok: false, reason: 'UNKNOWN_ACTION' });
    expect(refused['why']).toContain('not on this page');
    // Nothing failed a guard here, so nothing is offered as if it had.
    expect(refused['evidence']).toBeUndefined();
  });

  it('a guard the state view cannot fully judge marks the keys it took no view on', () => {
    const { port } = wizard();
    const refused = port.call('wizard.do_action', { action: 'step1.upgrade' });

    expect(refused['why']).toContain('conditions are not met');
    expect(refused['guardUnevaluated']).toEqual(['plan']);
  });

  it('declared here, conditions met, still not offered: says that much and no more', () => {
    // The tree layer knows reasons the flat door does not — a hidden tab, a
    // blocking overlay. `explain()` reads the graph, `available()` reads the
    // tree, and where they disagree the honest answer is the disagreement.
    const session = buildNavigationGraph('shop', {
      pages: {
        checkout: {
          tabs: {
            shipping: { actions: { 'save-address': { does: 'Save the shipping address' } } },
            payment: { actions: { 'save-card': { does: 'Save the payment card' } } },
          },
        },
      },
    }).createSession({ node: 'checkout', onWarn: () => undefined });
    session.registerActions('checkout.shipping');
    session.registerActions('checkout.payment');
    session.show('checkout.shipping'); // at-most-one-shown: payment flips hidden
    const port = serveToAgent(session);

    const refused = port.call('shop.do_action', { action: 'checkout.payment.save-card' });

    expect(refused).toMatchObject({ ok: false, reason: 'UNKNOWN_ACTION' });
    expect(refused['why']).toContain('not being offered right now');
    // No guessed reason: the port does not read the tree, so it does not name one.
    expect(refused['evidence']).toBeUndefined();
  });

  it('the evidence is a COPY — annotating a result must not rewrite the session', () => {
    const { session, port } = wizard();
    const refused = port.call('wizard.do_action', { action: 'step1.next' });
    (refused['evidence'] as Array<Record<string, unknown>>)[0]['result'] = true;

    expect(session.explain('step1.next').evidence[0]!.result).toBe(false);
  });
});

describe('what stays silent', () => {
  it('a name the graph really does not have gets the words it always got, and no more', () => {
    const { port } = wizard();
    const refused = port.call('wizard.do_action', { action: 'teleport' });

    expect(refused).toMatchObject({ ok: false, reason: 'UNKNOWN_ACTION' });
    expect(refused['actions']).toEqual(['step1.set-name']);
    // The library does not invent an explanation for a name it has never seen.
    expect(refused['why']).toBeUndefined();
  });

  it('an ambiguous SHORT name is answered by the id list, not by an explanation', () => {
    const session = buildNavigationGraph('shop', {
      pages: {
        catalog: {
          actions: {
            'save-dress': { does: 'Save the dress' },
            'save-hat': { does: 'Save the hat' },
          },
        },
      },
    }).createSession({ node: 'catalog', onWarn: () => undefined });
    session.registerActions('catalog', {
      handlers: { 'save-dress': () => undefined, 'save-hat': () => undefined },
    });
    const port = serveToAgent(session);

    // 'save-dress' and 'save-hat' both end in the asked suffix.
    const refused = port.call('shop.do_action', { action: 'dress' });
    expect(refused).toMatchObject({ ok: false, reason: 'UNKNOWN_ACTION' });
    expect(refused['why']).toBeUndefined();

    const ambiguous = port.call('shop.do_action', { action: 'save-dress' });
    expect(ambiguous['did']).toBe('catalog.save-dress'); // the exact id still fires
  });

  it('a served action is unaffected — the arm only runs when nothing matched', () => {
    const { port } = wizard();
    const fired = port.call('wizard.do_action', { action: 'set-name', input: { name: 'Ada' } });

    expect(fired['did']).toBe('step1.set-name');
    expect(fired['why']).toBeUndefined();
  });
});

describe('the boundary this refusal does NOT cross', () => {
  it('it never reaches fire(), so it is not an attempt in either ledger', () => {
    // PINNED, not lamented: the ledgers hold what the session was asked to DO.
    // This refusal is the port's own — it is documented that way on the Ground
    // truth page, and the model is told the truth in the turn it asked.
    const { session, port } = wizard();
    port.call('wizard.do_action', { action: 'step1.next' });
    port.call('wizard.do_action', { action: 'teleport' });

    expect(session.gaps()).toEqual([]);
    expect(session.transitions()).toEqual([]);
    expect(session.groundTruth().text).toContain('No actions have been performed in this app this session.');
  });

  it('a reach that DOES resolve is refused by the session, and that one is recorded', () => {
    // The contrast that makes the line legible: same model, same page, one name
    // the port can resolve — and the whole ledger machinery runs as always.
    const session = buildNavigationGraph('wizard', {
      pages: {
        step1: { actions: { next: { does: 'Go to step 2', goTo: 'step2' } } },
        step2: { actions: { finish: { does: 'Finish the wizard' } } },
      },
    }).createSession({ node: 'step1', onWarn: () => undefined });
    const port = serveToAgent(session); // nothing is bound to 'next'

    const refused = port.call('wizard.do_action', { action: 'step1.next' });

    expect(refused).toMatchObject({ ok: false, judgment: 'rejected', reason: 'NOT_MATERIALIZED' });
    expect(session.gaps().map((gap) => gap.rejectionReason)).toEqual(['NOT_MATERIALIZED']);
    expect(session.groundTruth().text).toContain('did NOT happen');
  });
});
