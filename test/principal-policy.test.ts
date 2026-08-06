/**
 * `principalPolicy` — WHO MAY PERFORM THIS, WHOSE CHOICE IT IS, AND WHETHER A
 * RECORDED YES IS NEEDED: three facts, three fields, one opt-in switch.
 *
 * WHY IT EXISTS. `humanDecides` is disclosure and stays disclosure. A
 * preregistered campaign then measured what disclosure alone is worth: in 20 of
 * 33 residual-harm rows the decisive warning was on the exact control at the
 * exact turn and the model fired anyway. A warning can be ignored; a required
 * protocol step cannot be skipped silently.
 *
 * WHAT THIS SUITE GUARDS is mostly the SEPARATION. Half the failure modes here
 * are one concept quietly doing another's job: an ownership declaration that
 * starts refusing fires, a permission list that files a person's act under the
 * wrong word, a per-action approval requirement that arms a gate no serving port
 * knows about (and so can never be answered).
 *
 * MUTATION PROOFS (each one run; the count is what it actually did):
 * - Let `decisionOwner: 'human'` imply `mayInvoke: ['human']` → 3 red, led by
 *   'NEVER refuses on ownership — decisionOwner is not a permission'.
 * - Drop the `enforcing` guard (every declaration gates) → 4 red.
 * - Drop the `opts.invoke !== false` term → 2 red (the app's own report of what
 *   already happened is refused).
 * - Let `actorKindOf('unknown')` answer 'system' → 1 red.
 * - Accept 'user' in mayInvoke at the authoring door → 1 red, and the silent
 *   lock-out it names.
 * - Arm the approval gate from the per-action flag alone → 3 red — including a
 *   PERSON refused at their own control, because that flag says nothing about
 *   the principal.
 */
import { describe, expect, it } from 'vitest';
import { GraphValidationError, buildNavigationGraph, serveToAgent } from '../src/index.js';
import type { InteractionSession, NavigationGraph, PrincipalPolicy } from '../src/index.js';
import { actorKindOf, checkPrincipalPolicy, principalOfActor } from '../src/traverse/principal-policy.js';

const TRANSFER = 'bank.transfer';

/** A bank with one human-only control and one ordinary one. */
function bank(): NavigationGraph {
  return buildNavigationGraph('bank', {
    pages: {
      bank: {
        actions: {
          transfer: {
            does: 'Transfer the balance',
            writes: ['balance'],
            principalPolicy: {
              mayInvoke: ['human'],
              decisionOwner: 'human',
              requiresHumanApproval: true,
            },
          },
          // Ownership DECLARED and nothing else: the disclosure-only half.
          rename: { does: 'Rename the account', principalPolicy: { decisionOwner: 'human' } },
          check: { does: 'Check the balance' },
        },
      },
    },
  });
}

function session(opts?: { enforce?: boolean; approvals?: boolean }): InteractionSession {
  const live = bank().createSession({
    node: 'bank',
    state: { balance: 100 },
    ...(opts?.enforce ? { enforcePrincipalPolicy: true } : {}),
    ...(opts?.approvals ? { requireHumanApproval: true } : {}),
    onWarn: () => undefined,
  });
  live.registerHandlers({
    group: 'app',
    handlers: {
      [TRANSFER]: () => undefined,
      'bank.rename': () => undefined,
      'bank.check': () => undefined,
    },
  });
  return live;
}

// ---------------------------------------------------------------------------
// The declaration
// ---------------------------------------------------------------------------

describe('the declaration: authored on the action, carried on the affordance', () => {
  it('compiles verbatim, and the graph owns its bytes', () => {
    const declared: PrincipalPolicy = { mayInvoke: ['human'], decisionOwner: 'human' };
    const graph = buildNavigationGraph('bank', {
      pages: { bank: { actions: { pay: { does: 'Pay', principalPolicy: declared } } } },
    });

    declared.mayInvoke!.push('agent'); // the author edits the object they passed

    expect(graph.spec.affordances['bank.pay'].principalPolicy).toEqual({
      mayInvoke: ['human'],
      decisionOwner: 'human',
    });
  });

  it('compiles at the mount door too, in the same words', () => {
    const live = session();
    live.registerActions('bank', {
      actions: {
        wire: { does: 'Wire the funds', principalPolicy: { mayInvoke: ['human'] }, handler: () => undefined },
      },
    });

    const edge = live.available().edges.find((row) => row.affordanceId === 'bank.wire');
    expect(edge?.mayInvoke).toEqual(['human']);
  });

  it('refuses `mayInvoke: [\'user\']` with the correction, at the keyboard', () => {
    expect(() =>
      buildNavigationGraph('bank', {
        pages: {
          bank: {
            actions: {
              // A record FILES an act under 'user'; a policy NAMES an actor.
              pay: { does: 'Pay', principalPolicy: { mayInvoke: ['user' as never] } },
            },
          },
        },
      }),
    ).toThrow(/write 'human'/);
  });

  it('refuses the other authoring mistakes, each in its own words', () => {
    const build = (principalPolicy: unknown): (() => unknown) => () =>
      buildNavigationGraph('bank', {
        pages: { bank: { actions: { pay: { does: 'Pay', principalPolicy: principalPolicy as never } } } },
      });

    expect(build('human')).toThrow(GraphValidationError);
    expect(build({ mayInvoke: 'human' })).toThrow(/must be an array/);
    expect(build({ mayInvoke: [] })).toThrow(/nobody may ever perform/);
    expect(build({ mayInvoke: ['robot'] })).toThrow(/not an actor kind/);
    expect(build({ decisionOwner: 'nobody' })).toThrow(/decisionOwner must be one of/);
    expect(build({ requiresHumanApproval: 'yes' })).toThrow(/must be true or false/);
  });

  it('refuses them at the mount door too', () => {
    const live = session();
    expect(() =>
      live.registerActions('bank', {
        actions: { wire: { does: 'Wire', principalPolicy: { mayInvoke: [] } } },
      }),
    ).toThrow(/nobody may ever perform/);
  });
});

// ---------------------------------------------------------------------------
// Disclosure: the default, unchanged
// ---------------------------------------------------------------------------

describe('with enforcement off, every declaration is disclosure', () => {
  it('lets an agent fire a human-only control, and records that it did', () => {
    const live = session();

    const fired = live.fire(TRANSFER, { source: 'agent' });

    expect(fired.ok).toBe(true);
    expect(live.transitions()[0].cause.principal).toBe('agent');
    expect(live.gaps()).toEqual([]);
  });

  it('still SAYS who may act — on the edge and on the agent’s own row', () => {
    const live = session();
    const port = serveToAgent(live, { source: 'agent' });

    const edge = live.available().edges.find((row) => row.affordanceId === TRANSFER);
    const row = (port.call('bank.whats_here')['actions'] as Array<Record<string, unknown>>).find(
      (candidate) => candidate['action'] === TRANSFER,
    );

    expect(edge?.mayInvoke).toEqual(['human']);
    expect(edge?.decisionOwner).toBe('human');
    // The row a model reads before it reaches for anything.
    expect(row?.['mayInvoke']).toEqual(['human']);
    expect(row?.['decisionOwner']).toBe('human');
  });

  it('serves a fresh copy — a consumer sorting the list cannot reach the graph', () => {
    const live = session();

    const first = live.available().edges.find((row) => row.affordanceId === TRANSFER)!;
    first.mayInvoke!.push('agent');
    const second = live.available().edges.find((row) => row.affordanceId === TRANSFER)!;

    expect(second.mayInvoke).toEqual(['human']);
  });
});

// ---------------------------------------------------------------------------
// Enforcement: actor identity
// ---------------------------------------------------------------------------

describe('with enforcement on, mayInvoke is a refusal', () => {
  it('refuses the agent and NAMES the actor the app requires', () => {
    const live = session({ enforce: true });

    const fired = live.fire(TRANSFER, { source: 'agent' });

    expect(fired).toEqual({
      ok: false,
      reason: 'PRINCIPAL_NOT_ALLOWED',
      affordanceId: TRANSFER,
      required: ['human'],
      attempted: 'agent',
    });
  });

  it('writes the refusal to the gap ledger as a security row', () => {
    const live = session({ enforce: true });

    live.fire(TRANSFER, { source: 'agent' });

    expect(live.gaps()).toMatchObject([
      { kind: 'fire-rejected', affordanceId: TRANSFER, rejectionReason: 'PRINCIPAL_NOT_ALLOWED', principal: 'agent' },
    ]);
  });

  it('lets the person the app named through', () => {
    const live = session({ enforce: true });

    expect(live.fire(TRANSFER, { source: 'user' }).ok).toBe(true);
  });

  it('refuses a principal nobody can name — you cannot grant a permission to nobody', () => {
    const live = session({ enforce: true });

    const fired = live.fire(TRANSFER, { source: 'unknown' });

    expect(fired.ok).toBe(false);
    expect(!fired.ok && fired.reason).toBe('PRINCIPAL_NOT_ALLOWED');
  });

  it('records what already happened — a report is not a request to act', () => {
    const live = session({ enforce: true });

    // The DOM sensor's mode: the browser already ran the app's own onClick.
    const fired = live.fire(TRANSFER, { source: 'agent', invoke: false });

    expect(fired.ok).toBe(true);
  });

  it('leaves an action that declared no list alone', () => {
    const live = session({ enforce: true });

    expect(live.fire('bank.check', { source: 'agent' }).ok).toBe(true);
  });

  it('NEVER refuses on ownership — decisionOwner is not a permission', () => {
    const live = session({ enforce: true });

    // `rename` declares `decisionOwner: 'human'` and no `mayInvoke`.
    const fired = live.fire('bank.rename', { source: 'agent' });

    // MUTATION PROOF: read decisionOwner in checkPrincipalPolicy and this fire
    // is refused by a rule the app never wrote.
    expect(fired.ok).toBe(true);
  });

  it('teaches the model what to do instead, in this library’s own words', () => {
    const live = session({ enforce: true });
    const port = serveToAgent(live, { source: 'agent' });

    const result = port.call('bank.do_action', { action: TRANSFER });

    expect(result['reason']).toBe('PRINCIPAL_NOT_ALLOWED');
    expect(result['required']).toEqual(['human']);
    expect(result['attempted']).toBe('agent');
    expect(String(result['why'])).toMatch(/a PERSON performs this action/);
    // Never a retry: nothing about the world changes who the caller is.
    expect(result['retriable']).toBeUndefined();
  });

  it('says the plainer sentence when the list is not about people', () => {
    const graph = buildNavigationGraph('ops', {
      pages: {
        ops: {
          actions: {
            reindex: { does: 'Reindex', principalPolicy: { mayInvoke: ['system'] } },
          },
        },
      },
    });
    const live = graph.createSession({ node: 'ops', state: {}, enforcePrincipalPolicy: true, onWarn: () => undefined });
    live.registerHandlers({ group: 'app', handlers: { 'ops.reindex': () => undefined } });
    const port = serveToAgent(live, { source: 'agent' });

    const result = port.call('ops.do_action', { action: 'ops.reindex' });

    expect(String(result['why'])).toMatch(/declares who may perform this action/);
  });
});

// ---------------------------------------------------------------------------
// Enforcement: consent status
// ---------------------------------------------------------------------------

describe('requiresHumanApproval widens the approval gate, and never arms it alone', () => {
  it('holds a NON-high-effect action to the recorded-approval gate', () => {
    const live = session({ enforce: true, approvals: true });

    // `transfer` is not `confirm: true`; its own declaration is what pulls it in.
    const fired = live.fire(TRANSFER, { source: 'user' });
    expect(fired.ok).toBe(true); // the gate keys on the agent, as it always has

    const asAgent = live.fire('bank.rename', { source: 'agent' });
    expect(asAgent.ok).toBe(true); // no declaration, not high-effect: untouched
  });

  it('refuses an agent fire of the declaring action with no yes on record', () => {
    const graph = buildNavigationGraph('bank', {
      pages: {
        bank: {
          actions: {
            note: {
              does: 'Leave a note',
              principalPolicy: { requiresHumanApproval: true },
            },
          },
        },
      },
    });
    const live = graph.createSession({
      node: 'bank',
      state: {},
      requireHumanApproval: true,
      enforcePrincipalPolicy: true,
      onWarn: () => undefined,
    });
    live.registerHandlers({ group: 'app', handlers: { 'bank.note': () => undefined } });

    const fired = live.fire('bank.note', { source: 'agent' });

    expect(fired.ok).toBe(false);
    expect(!fired.ok && fired.reason).toBe('APPROVAL_REQUIRED');
  });

  it('and the loop CLOSES: the refusal hands back the card, and the approved fire lands', () => {
    const graph = buildNavigationGraph('bank', {
      pages: {
        bank: {
          actions: {
            note: { does: 'Leave a note', principalPolicy: { requiresHumanApproval: true } },
          },
        },
      },
    });
    const live = graph.createSession({
      node: 'bank',
      state: {},
      requireHumanApproval: true,
      enforcePrincipalPolicy: true,
      onWarn: () => undefined,
    });
    live.registerHandlers({ group: 'app', handlers: { 'bank.note': () => undefined } });
    const port = serveToAgent(live, { source: 'agent' });

    // Turn 1: the model asks, and is handed a card instead of a wall.
    const refused = port.call('bank.do_action', { action: 'bank.note' });
    const askId = String(refused['askId']);
    expect(refused['judgment']).toBe('needs-confirm');

    // The person answers in the app.
    live.approveAsk(askId, { by: 'ada' });

    // Turn 2: the same call now crosses.
    const done = port.call('bank.do_action', { action: 'bank.note', confirm: true });
    expect(done['ok']).toBe(true);
  });

  it('does nothing at all without the session-wide gate', () => {
    // MUTATION PROOF: arm the gate from the per-action flag alone and this fire
    // is refused by a gate no serving port knows about — a refusal that can
    // never be answered, because nothing would mint the pointer.
    const live = session({ enforce: true });

    expect(live.fire(TRANSFER, { source: 'agent', invoke: false }).ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// The two vocabularies, and the bridge
// ---------------------------------------------------------------------------

describe('an actor kind is not a principal', () => {
  it('bridges in both directions, and answers nothing for `unknown`', () => {
    expect(actorKindOf('user')).toBe('human');
    expect(actorKindOf('agent')).toBe('agent');
    expect(actorKindOf('system')).toBe('system');
    expect(actorKindOf('unknown')).toBeUndefined();
    expect(principalOfActor('human')).toBe('user');
    expect(principalOfActor('agent')).toBe('agent');
    expect(principalOfActor('system')).toBe('system');
  });

  it('passes everything while enforcement is off, and judges only lists', () => {
    expect(checkPrincipalPolicy({ policy: { mayInvoke: ['human'] }, principal: 'agent', enforcing: false })).toEqual({ ok: true });
    expect(checkPrincipalPolicy({ policy: undefined, principal: 'agent', enforcing: true })).toEqual({ ok: true });
    expect(checkPrincipalPolicy({ policy: { decisionOwner: 'human' }, principal: 'agent', enforcing: true })).toEqual({ ok: true });
  });

  it('copies the required list into the refusal', () => {
    const policy = { mayInvoke: ['human' as const] };
    const verdict = checkPrincipalPolicy({ policy, principal: 'agent', enforcing: true });

    expect(verdict.ok).toBe(false);
    if (verdict.ok) throw new Error('unreachable');
    verdict.required.push('agent');
    expect(policy.mayInvoke).toEqual(['human']);
  });
});

// ---------------------------------------------------------------------------
// Principal-bound ports
// ---------------------------------------------------------------------------

describe('a port says who you are once, at the boundary', () => {
  it('stamps the principal on every act it carries', () => {
    const live = session();
    const agent = live.asAgent();
    const human = live.asHuman();
    const system = live.asSystem();

    agent.fire('bank.check');
    human.fire('bank.check');
    system.fire('bank.check');

    expect(live.transitions().map((row) => row.cause.principal)).toEqual(['agent', 'user', 'system']);
  });

  it('names the actor kind AND the principal its acts are filed under', () => {
    const live = session();

    expect(live.asHuman().as).toBe('human');
    expect(live.asHuman().principal).toBe('user');
    expect(live.asAgent().as).toBe('agent');
    expect(live.asSystem().principal).toBe('system');
  });

  it('is the SAME assertion a per-call source makes — never a stronger one', () => {
    const live = session();

    live.asAgent().fire('bank.check');

    // MUTATION PROOF: stamp a distinct basis for the port and this reads as a
    // stronger claim than the caller actually made.
    expect(live.transitions()[0].attribution).toEqual({
      principal: 'agent',
      basis: 'caller-asserted',
      certainty: 'observed',
    });
  });

  it('goes through the same gates a direct call does', () => {
    const live = session({ enforce: true });

    const refused = live.asAgent().fire(TRANSFER);
    const allowed = live.asHuman().fire(TRANSFER);

    expect(!refused.ok && refused.reason).toBe('PRINCIPAL_NOT_ALLOWED');
    expect(allowed.ok).toBe(true);
  });

  it('carries the other principal-bearing doors, and no authority door at all', () => {
    const live = session();
    const port = live.asHuman();

    port.sync('bank');
    const gap = port.reportGap({ request: 'a statement' });

    expect(gap.principal).toBe('user');
    // The human-side doors stay on the session, where handing the wrong port to
    // the wrong caller cannot become a capability.
    expect('approveAsk' in port).toBe(false);
    expect('alwaysApprove' in port).toBe(false);
    expect('updateState' in port).toBe(false);
  });

  it('passes a stimulus through, and still stamps its own principal', () => {
    const live = session();

    const hop = live.asHuman().sync('bank', { stimulus: 'navigation' });

    expect(hop.changed).toBe(false);
    const moved = live.asHuman().sync('bank');
    expect(moved.changed).toBe(false);
  });
});
