/**
 * The dogfood proof: hcifootprint/mcp really is an MCP server. A genuine MCP
 * Client (from @modelcontextprotocol/sdk) connects over an in-memory transport
 * and drives the live session — tools/list + tools/call — with zero
 * framework-specific glue. This is what makes the library framework-agnostic.
 */
import { describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { buildNavigationGraph } from '../src/index.js';
import { mcpServer } from '../src/mcp.js';

function shopSession() {
  const map = buildNavigationGraph('shop', {
    pages: {
      catalog: {
        tools: {
          search: { does: 'Search dresses', writes: ['n'] },
          'add-to-cart': { does: 'Add the dress to the cart', writes: ['cart'] },
        },
      },
      checkout: {
        tools: { 'place-order': { does: 'Place the order', confirm: true, writes: ['orders'] } },
      },
    },
    skills: {
      purchase: { does: 'Buy a dress', steps: ['add-to-cart', 'place-order'] },
      browse: { does: 'Look around the catalog', steps: ['search'] },
    },
  });
  return map.createSession({ node: 'catalog', state: { cart: [], n: 0 } });
}

async function connectClient(
  session: ReturnType<typeof shopSession>,
  opts?: { settleWithinMs?: number },
) {
  const [clientT, serverT] = InMemoryTransport.createLinkedPair();
  const server = mcpServer(session, opts);
  await server.connect(serverT);
  const client = new Client({ name: 'test-host', version: '0.0.0' });
  await client.connect(clientT);
  return client;
}

// The SDK's CallToolResult is a union (a toolResult arm has no `content`), so
// accept the result loosely and narrow to the text-content arm we assert on.
const text = (res: unknown) =>
  JSON.parse(
    ((res as { content: { type: string; text: string }[] }).content[0]).text,
  ) as Record<string, unknown>;

describe('mcpServer — a real MCP server backed by a live session', () => {
  it('tools/list returns the FIXED tool set (one per skill + the three generics)', async () => {
    const client = await connectClient(shopSession());
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toEqual([
      'shop.skill.purchase',
      'shop.skill.browse',
      'shop.whats_here',
      'shop.why',
      'shop.do_action',
      'shop.did_it_work',
    ]);
    const purchase = tools.find((t) => t.name === 'shop.skill.purchase')!;
    expect(Object.keys((purchase.inputSchema as { properties: object }).properties).sort()).toEqual([
      'confirm',
      'decline',
      'input',
      'instance',
      'step',
    ]);
  });

  it('tools/call routes to the session — open a skill, get readySteps back as data', async () => {
    const session = shopSession();
    // The agent acts on a WIRED app (0.4.x never-trap gate: an agent commit
    // whose entry step cannot materialise refuses ENTRY_NOT_MATERIALIZED).
    session.registerToolGroup('catalog', { handlers: { search: () => undefined } });
    const client = await connectClient(session);
    const res = await client.callTool({ name: 'shop.skill.browse', arguments: {} });
    const payload = text(res);
    expect(payload['ok']).toBe(true);
    expect((payload['readySteps'] as { step: string }[]).map((s) => s.step)).toContain('catalog.search');
  });

  it('the tool array is byte-identical across calls (cache-stable, no list_changed)', async () => {
    const session = shopSession();
    const client = await connectClient(session);
    const before = JSON.stringify((await client.listTools()).tools);
    await client.callTool({ name: 'shop.skill.browse', arguments: {} });
    session.sync('checkout'); // navigate — the world moves
    const after = JSON.stringify((await client.listTools()).tools);
    expect(after).toBe(before);
  });

  it('a high-effect step returns needs-confirm — the portable, host-agnostic HITL signal', async () => {
    const session = shopSession();
    session.sync('checkout'); // place-order lives here
    session.registerToolGroup('checkout', { handlers: { 'place-order': () => undefined } });
    // purchase's ENTRY step must materialise for the agent commit to open the
    // frame at all (0.4.x never-trap gate) — wire the app's side of it too.
    session.registerToolGroup('catalog', { handlers: { 'add-to-cart': () => undefined } });
    const client = await connectClient(session);
    await client.callTool({ name: 'shop.skill.purchase', arguments: {} });
    const res = await client.callTool({ name: 'shop.skill.purchase', arguments: { step: 'place-order' } });
    const asked = text(res);
    expect(asked['judgment']).toBe('needs-confirm');
    // …carrying the RECEIPTS the host shows the human, intact across JSON/the wire:
    const receipts = asked['receipts'] as { willDo: { does: string; writes?: string[] }; youAreOn: string };
    expect(receipts.willDo).toMatchObject({ does: 'Place the order', writes: ['orders'] });
    expect(receipts.youAreOn).toBe('checkout');
    expect(typeof asked['askId']).toBe('string');
    // …and the host confirming (calling again with confirm:true) actually fires it:
    const fired = await client.callTool({
      name: 'shop.skill.purchase',
      arguments: { step: 'place-order', confirm: true },
    });
    expect(text(fired)['did']).toBe('checkout.place-order');
    // the confirmed fire closed the ask as approved, linked to the transition:
    const chain = session.confirms();
    expect(chain.map((c) => c.kind)).toEqual(['ask', 'approved']);
    expect(chain[1].askId).toBe(asked['askId']);
  });

  it('an unbound agent fire surfaces NOT_MATERIALIZED over the server too', async () => {
    const session = shopSession(); // nothing registered: the tool is declared only
    const client = await connectClient(session);
    // do_action is the door here: page actions stay reachable regardless of
    // skill state (the never-trap SERVE stance), while a SKILL whose entry is
    // unbound now refuses at commit — asserted right below.
    const res = text(
      await client.callTool({ name: 'shop.do_action', arguments: { action: 'search' } }),
    );
    expect(res).toMatchObject({ ok: false, judgment: 'rejected', reason: 'NOT_MATERIALIZED' });
    expect(res['why']).toContain('Nothing in the app is wired');
    expect(session.state()['n']).toBe(0); // nothing moved

    // The 0.4.x never-trap gate, over the wire: the frame that could never
    // act is never opened, and the refusal names the entry step.
    const committed = text(await client.callTool({ name: 'shop.skill.browse', arguments: {} }));
    expect(committed).toMatchObject({ ok: false, reason: 'ENTRY_NOT_MATERIALIZED' });
    expect(session.skillFrame()).toBeNull();
  });

  it('produced data (a handler return) travels IN the tool result over MCP', async () => {
    const map = buildNavigationGraph('shop', {
      pages: { catalog: { tools: { search: { does: 'Search', writes: ['n'] } } } },
      skills: { browse: { does: 'Browse', steps: ['search'] } },
    });
    const session = map.createSession({ node: 'catalog', state: { n: 0 } });
    const found = [{ id: 'd6', name: 'Scarlet Cocktail Dress', price: 149 }];
    session.registerToolGroup('catalog', {
      handlers: {
        search: () => {
          session.updateState({ n: 1 });
          return found; // the app's own return value
        },
      },
    });
    const client = await connectClient(session);
    await client.callTool({ name: 'shop.skill.browse', arguments: {} });
    const res = await client.callTool({ name: 'shop.skill.browse', arguments: { step: 'search' } });
    const payload = text(res);
    expect(payload['did']).toBe('catalog.search');
    expect((payload['data'] as { id: string }[])[0].id).toBe('d6'); // came back over the wire
  });

  it('an unknown tool comes back as isError, never a crash', async () => {
    const client = await connectClient(shopSession());
    const res = await client.callTool({ name: 'shop.skill.ghost', arguments: {} });
    expect(res.isError).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// settleWithinMs — the one place in the library where waiting is allowed
// ---------------------------------------------------------------------------

/**
 * A tool call is already an async turn and the model is going to ask "did it
 * work?" anyway, so the server gives the app a moment and folds the settled
 * truth into the SAME result. This is the rewrite the reporting integration
 * hand-built on its own relay send path — done here, once, at the boundary.
 *
 * MUTATION PROOF: put back the `setTimeout(0)` fold and 'the settled word' /
 * 'a refusal' fail — the handler that takes 5ms still reads 'pending', which
 * is exactly what the wire used to say about an action that had already
 * finished (or already failed).
 *
 * MUTATION PROOF (the `0` pair): make `0` skip the fold — the "off switch" the
 * option was once documented as — and 'an answer already in hand still folds'
 * fails. It is the shortest CEILING, not an off switch, and the two tests below
 * pin both halves so the sentence in the docs cannot drift from the behaviour
 * again.
 */
describe('settleWithinMs — the settled truth folded into the fire result', () => {
  /** A shop whose add-to-cart takes `delayMs` and then reports (or fails). */
  function slowShop(delayMs: number, fail?: string) {
    const map = buildNavigationGraph('shop', {
      pages: { catalog: { tools: { search: { does: 'Search dresses', writes: ['n'] } } } },
      skills: { browse: { does: 'Look around', steps: ['search'] } },
    });
    const session = map.createSession({ node: 'catalog', state: { n: 0 }, onWarn: () => undefined });
    session.registerToolGroup('catalog', {
      handlers: {
        search: async () => {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          if (fail) throw new Error(fail);
          // Reported from the handler's ASYNC portion — the attribution ladder
          // matches it to its own in-flight fire by declared writes.
          session.updateState({ n: 1 });
          return [{ id: 'd6' }];
        },
      },
    });
    return session;
  }

  it('settles inside the ceiling: the RESULT carries the final word, not the queued one', async () => {
    const session = slowShop(5);
    const client = await connectClient(session);
    const res = text(await client.callTool({ name: 'shop.do_action', arguments: { action: 'search' } }));

    expect(res['did']).toBe('catalog.search');
    expect(res['effectStatus']).toBe('performed'); // rewritten from 'pending'
    expect((res['data'] as { id: string }[])[0].id).toBe('d6');
    // The pointer told the model to go poll; it just got the answer instead.
    expect(res['howToSettle']).toBeUndefined();
  });

  it('a refusal folds too — the wire learns the action FAILED, in the same turn', async () => {
    const session = slowShop(5, 'card declined');
    const client = await connectClient(session);
    const res = text(await client.callTool({ name: 'shop.do_action', arguments: { action: 'search' } }));

    expect(res['effectStatus']).toBe('refused');
    expect(String(res['error'])).toContain('card declined');
  });

  it('misses the ceiling: pending STANDS, and did_it_work is the named next call', async () => {
    const session = slowShop(40);
    const client = await connectClient(session, { settleWithinMs: 1 });
    const res = text(await client.callTool({ name: 'shop.do_action', arguments: { action: 'search' } }));

    // Never guessed: the ceiling decides how long to wait, never what the
    // answer is. 'pending' is what was true when the ceiling expired.
    expect(res['effectStatus']).toBe('pending');
    expect(String(res['howToSettle'])).toContain('shop.did_it_work');

    // …and the door it names really does answer, once the app is done.
    await new Promise((resolve) => setTimeout(resolve, 60));
    const poll = text(
      await client.callTool({
        name: 'shop.did_it_work',
        arguments: { transitionId: res['transitionId'] as string },
      }),
    );
    expect(poll).toMatchObject({ settled: true, effectStatus: 'performed', effectVerified: true });
  });

  it('a fire nobody will ever report does not hang the call — the ceiling answers', async () => {
    const session = shopSession(); // handlers registered, tap never reports
    session.registerToolGroup('catalog', { handlers: { search: () => undefined } });
    const client = await connectClient(session, { settleWithinMs: 5 });
    const res = text(await client.callTool({ name: 'shop.do_action', arguments: { action: 'search' } }));
    expect(res).toMatchObject({ ok: true, effectStatus: 'pending' });
  });

  /** A shop whose handler reports in the SAME turn — no timer anywhere. */
  function instantShop() {
    const map = buildNavigationGraph('shop', {
      pages: { catalog: { tools: { search: { does: 'Search dresses', writes: ['n'] } } } },
      skills: { browse: { does: 'Look around', steps: ['search'] } },
    });
    const session = map.createSession({ node: 'catalog', state: { n: 0 }, onWarn: () => undefined });
    session.registerToolGroup('catalog', {
      handlers: {
        search: () => {
          session.updateState({ n: 1 });
          return [{ id: 'd6' }];
        },
      },
    });
    return session;
  }

  it('0 — an answer already in hand still folds: the shortest ceiling, not an off switch', async () => {
    // The timer is a macrotask, so a handler reporting in the same microtask
    // turn wins the race even at 0. Withholding an answer the session is
    // already holding would be the one dishonest move available here.
    const client = await connectClient(instantShop(), { settleWithinMs: 0 });
    const res = text(await client.callTool({ name: 'shop.do_action', arguments: { action: 'search' } }));

    expect(res['effectStatus']).toBe('performed');
    expect((res['data'] as { id: string }[])[0].id).toBe('d6');
    expect(res['howToSettle']).toBeUndefined(); // the pointer is stale; it goes
  });

  it('0 — and it really is the SHORTEST ceiling: one timer is already too slow', async () => {
    const client = await connectClient(slowShop(0), { settleWithinMs: 0 });
    const res = text(await client.callTool({ name: 'shop.do_action', arguments: { action: 'search' } }));

    // slowShop(0) still awaits a timer, so its report lands after the ceiling.
    // Nothing is invented: 'pending' was true when the ceiling expired.
    expect(res['effectStatus']).toBe('pending');
    expect(String(res['howToSettle'])).toContain('shop.did_it_work');
  });
});
