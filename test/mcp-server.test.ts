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

async function connectClient(session: ReturnType<typeof shopSession>) {
  const [clientT, serverT] = InMemoryTransport.createLinkedPair();
  const server = mcpServer(session);
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
  it('tools/list returns the FIXED tool set (one per skill + the two generics)', async () => {
    const client = await connectClient(shopSession());
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toEqual([
      'shop.skill.purchase',
      'shop.skill.browse',
      'shop.whats_here',
      'shop.do_action',
    ]);
    const purchase = tools.find((t) => t.name === 'shop.skill.purchase')!;
    expect(Object.keys((purchase.inputSchema as { properties: object }).properties).sort()).toEqual([
      'confirm',
      'input',
      'instance',
      'step',
    ]);
  });

  it('tools/call routes to the session — open a skill, get readySteps back as data', async () => {
    const client = await connectClient(shopSession());
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
    const client = await connectClient(session);
    await client.callTool({ name: 'shop.skill.purchase', arguments: {} });
    const res = await client.callTool({ name: 'shop.skill.purchase', arguments: { step: 'place-order' } });
    expect(text(res)['judgment']).toBe('needs-confirm');
    // …and the host confirming (calling again with confirm:true) actually fires it:
    const fired = await client.callTool({
      name: 'shop.skill.purchase',
      arguments: { step: 'place-order', confirm: true },
    });
    expect(text(fired)['did']).toBe('checkout.place-order');
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
