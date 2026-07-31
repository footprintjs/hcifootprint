/**
 * THE CONSENT INVARIANT: a `transitionId` is minted only by an EXECUTED FIRE.
 * No paused or refused result ever carries one.
 *
 * It is not a naming convention. A `TransitionRecord` is built after every gate
 * has already said yes — the approval gate refuses and returns before the record
 * exists, and the needs-confirm arms return before `fire()` is called at all —
 * so the presence of the field is the fact that something actually ran.
 *
 * TWO THINGS REST ON IT, and this file is the guard that keeps them standing.
 *
 * A caller can BRANCH on it. `whenSettled`, `settledAnswer` and `did_it_work`
 * all key on a transition, and there is no transition for a question a human has
 * not answered. A pause carries an `askId` instead: two id families, two
 * objects, no overlap (docs/design/answer-grammar.md, rule 3).
 *
 * An awaited call cannot BLOCK ON A HUMAN. `mcpServer` folds the settled truth
 * into a result only when that result carries a `transitionId`, and waits — up
 * to its ceiling — for that id to come to rest. Grow one on a needs-confirm arm
 * and the server starts waiting on an action nobody has approved: the tool call
 * holds the turn open until the ceiling expires, and the model that should have
 * gone to fetch a person is sitting on a stopped clock. The last test here is
 * that consequence, measured.
 *
 * MUTATION PROOF: put `transitionId: '…'` on any arm the sweep covers and the
 * sweep goes red naming that arm; put it on a needs-confirm arm and the timing
 * test goes red as well, having actually waited.
 */
import { describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { buildNavigationGraph, skillsAsTools } from '../src/index.js';
import { mcpServer } from '../src/mcp.js';
import type { NavigationGraph, ServeResult, Session } from '../src/index.js';

function shopMap(): NavigationGraph {
  return buildNavigationGraph('shop', {
    pages: {
      checkout: {
        tools: {
          'place-order': { does: 'Place the order', confirm: true, writes: ['orders'] },
          'add-note': { does: 'Add a gift note', writes: ['note'] },
          'print-receipt': { does: 'Print the receipt', input: 'none' },
          'apply-credit': { does: 'Apply store credit', enabledWhen: { credit: { gt: 0 } } },
          'export-all': { does: 'Export every order' }, // declared, never wired
        },
      },
    },
    skills: {
      purchase: { does: 'Buy it', steps: ['place-order'] },
      audit: { does: 'Review the orders', steps: ['export-all'], when: { auditor: { eq: true } } },
    },
  });
}

function shop(enforced = false): { session: Session; port: ReturnType<typeof skillsAsTools> } {
  const session = shopMap().createSession({
    node: 'checkout',
    state: { orders: [], credit: 0, auditor: false },
    ...(enforced ? { requireHumanApproval: true as const } : {}),
    onWarn: () => undefined,
  });
  session.registerToolGroup('checkout', {
    handlers: {
      'place-order': () => undefined,
      'add-note': () => undefined,
      'print-receipt': () => undefined,
      'apply-credit': () => undefined,
    },
  });
  return { session, port: skillsAsTools(session) };
}

/**
 * Every arm this port can produce WITHOUT anything having executed — the pauses,
 * the refusals and the typed errors, each labelled so a failure names itself.
 */
function armsThatFiredNothing(): [string, ServeResult][] {
  const arms: [string, ServeResult][] = [];
  const { port } = shop();
  const enforced = shop(true);

  // --- the pause, from both doors ------------------------------------------
  const asked = port.call('shop.do_action', { action: 'place-order' });
  arms.push(['needs-confirm (do_action)', asked]);
  // Asked HERE, while the card is genuinely open: the declines below close it,
  // and a fate read after the fact would be a different arm wearing this label.
  const awaitingHuman = port.call('shop.did_it_work', { transitionId: asked['askId'] as string });
  port.call('shop.skill.purchase', {});
  arms.push([
    'needs-confirm (skill step)',
    port.call('shop.skill.purchase', { step: 'place-order' }),
  ]);
  arms.push([
    'declined (do_action)',
    port.call('shop.do_action', { action: 'place-order', decline: true }),
  ]);
  arms.push([
    'declined (skill step)',
    port.call('shop.skill.purchase', { step: 'place-order', decline: true }),
  ]);
  arms.push([
    'needs-confirm (enforced APPROVAL_REQUIRED)',
    enforced.port.call('shop.do_action', { action: 'place-order', confirm: true }),
  ]);

  // --- the ask book ---------------------------------------------------------
  arms.push(['did_it_work → awaiting-human', awaitingHuman]);
  const declinedAsk = enforced.port.call('shop.do_action', { action: 'add-note' });
  arms.push(['a low-effect action needs no ask', declinedAsk]); // control: this one DID fire

  // --- the refusals ---------------------------------------------------------
  arms.push(['rejected NOT_MATERIALIZED', port.call('shop.do_action', { action: 'export-all' })]);
  arms.push(['rejected TOOL_DISABLED', port.call('shop.do_action', { action: 'apply-credit' })]);
  arms.push([
    'rejected PAYLOAD_INVALID',
    port.call('shop.do_action', { action: 'print-receipt', input: { copies: 2 } }),
  ]);

  // --- the typed errors -----------------------------------------------------
  arms.push(['error UNKNOWN_ACTION', port.call('shop.do_action', { action: 'nonesuch' })]);
  arms.push(['error UNKNOWN_STEP', port.call('shop.skill.purchase', { step: 'nonesuch' })]);
  arms.push(['error UNKNOWN_TOOL', port.call('shop.skill.ghost', {})]);
  arms.push(['error ACTION_REQUIRED', port.call('shop.do_action', {})]);
  arms.push(['error TRANSITION_ID_REQUIRED', port.call('shop.did_it_work', {})]);
  arms.push(['error KEY_REQUIRED', port.call('shop.why', {})]);
  arms.push([
    'error UNKNOWN_TRANSITION',
    port.call('shop.did_it_work', { transitionId: 'checkout.place-order#99' }),
  ]);

  // --- the blocked skill ----------------------------------------------------
  arms.push(['blocked (precondition)', port.call('shop.skill.audit', {})]);

  // --- the read-only doors --------------------------------------------------
  arms.push(['whats_here', port.call('shop.whats_here', {})]);
  arms.push(['why', port.call('shop.why', { key: 'orders' })]);

  return arms;
}

describe('no paused or refused result carries a transitionId', () => {
  const arms = armsThatFiredNothing();

  it('every arm this port can produce without firing is covered', () => {
    // The sweep is only worth what it covers, so the count is asserted: a new
    // arm added without a row here is a hole the guard cannot see.
    expect(arms).toHaveLength(20);
  });

  it('each arm really IS the arm it is labelled', () => {
    // Without this, the sweep could pass while covering nothing: twenty results
    // that had all quietly collapsed into UNKNOWN_ACTION would satisfy every
    // other assertion in this file.
    const by = (label: string): ServeResult => arms.find(([name]) => name === label)![1];

    expect(by('needs-confirm (do_action)')['judgment']).toBe('needs-confirm');
    expect(by('needs-confirm (skill step)')['judgment']).toBe('needs-confirm');
    expect(by('declined (do_action)')['judgment']).toBe('declined');
    expect(by('declined (skill step)')['judgment']).toBe('declined');
    expect(by('needs-confirm (enforced APPROVAL_REQUIRED)')['reason']).toBe('APPROVAL_REQUIRED');
    expect(by('did_it_work → awaiting-human')['judgment']).toBe('awaiting-human');
    expect(by('rejected NOT_MATERIALIZED')['reason']).toBe('NOT_MATERIALIZED');
    expect(by('rejected TOOL_DISABLED')['reason']).toBe('TOOL_DISABLED');
    expect(by('rejected PAYLOAD_INVALID')['reason']).toBe('PAYLOAD_INVALID');
    expect(by('error UNKNOWN_ACTION')['reason']).toBe('UNKNOWN_ACTION');
    expect(by('error UNKNOWN_STEP')['reason']).toBe('UNKNOWN_STEP');
    expect(by('error UNKNOWN_TOOL')['reason']).toBe('UNKNOWN_TOOL');
    expect(by('error ACTION_REQUIRED')['reason']).toBe('ACTION_REQUIRED');
    expect(by('error TRANSITION_ID_REQUIRED')['reason']).toBe('TRANSITION_ID_REQUIRED');
    expect(by('error KEY_REQUIRED')['reason']).toBe('KEY_REQUIRED');
    expect(by('error UNKNOWN_TRANSITION')['reason']).toBe('UNKNOWN_TRANSITION');
    expect(by('blocked (precondition)')['judgment']).toBe('blocked');
    expect(by('whats_here')['ok']).toBe(true);
    expect(by('why')['ok']).toBe(true);
  });

  it('…and not one of them mints an id', () => {
    const offenders = arms
      .filter(([label]) => label !== 'a low-effect action needs no ask')
      .filter(([, result]) => 'transitionId' in result)
      .map(([label]) => label);
    expect(offenders).toEqual([]);
  });

  it('the pauses say what they are instead — an askId, which is a different object', () => {
    const [, asked] = arms[0];
    expect(asked).toMatchObject({ judgment: 'needs-confirm', performed: false });
    expect(typeof asked['askId']).toBe('string');
    expect(asked).not.toHaveProperty('transitionId');
  });

  it('the control proves the sweep can see one: an executed fire DOES carry it', () => {
    // Without this, every assertion above would pass on a port that had stopped
    // minting ids at all.
    const fired = arms.find(([label]) => label === 'a low-effect action needs no ask')![1];
    expect(fired['ok']).toBe(true);
    expect(typeof fired['transitionId']).toBe('string');
  });
});

describe('the gate refuses BEFORE the record exists', () => {
  it('an enforced refusal leaves the ledger with nothing to point at', () => {
    // Not merely "the result omits the field" — there is no record to name. A
    // refusal that minted a row first and refused second would leave a
    // transition an agent could ask `did_it_work` about, for an action a person
    // never approved.
    const { session, port } = shop(true);
    expect(session.transitions()).toHaveLength(0);

    port.call('shop.do_action', { action: 'place-order', confirm: true });

    expect(session.transitions()).toHaveLength(0);
    // The refusal IS on the record — in the ledger built for refusals.
    expect(session.gaps().at(-1)).toMatchObject({
      kind: 'fire-rejected',
      rejectionReason: 'APPROVAL_REQUIRED',
    });
  });

  it('a needs-confirm ask leaves the ledger empty too — an ask is not a fire', () => {
    const { session, port } = shop();
    port.call('shop.do_action', { action: 'place-order' });
    expect(session.transitions()).toHaveLength(0);
    expect(session.asks()).toHaveLength(1);
  });
});

describe('the consequence: an awaited call cannot block on a person', () => {
  it('a needs-confirm answers at once, with the ceiling set absurdly high', async () => {
    // The structural claim, measured. The server awaits a settlement only for a
    // result carrying a transitionId; a pause carries none, so the ceiling is
    // never entered. Were the invariant broken, this call would sit for the
    // full two seconds waiting for a human to press a button.
    const { session } = shop();
    const [clientT, serverT] = InMemoryTransport.createLinkedPair();
    const server = mcpServer(session, { settleWithinMs: 2000 });
    await server.connect(serverT);
    const client = new Client({ name: 'test-host', version: '0.0.0' });
    await client.connect(clientT);

    const started = Date.now();
    const res = await client.callTool({ name: 'shop.do_action', arguments: { action: 'place-order' } });
    const elapsed = Date.now() - started;

    const body = JSON.parse((res as { content: { text: string }[] }).content[0].text) as ServeResult;
    expect(body).toMatchObject({ judgment: 'needs-confirm', performed: false });
    expect(body).not.toHaveProperty('transitionId');
    expect(elapsed).toBeLessThan(500);
  });
});
