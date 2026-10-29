import { describe, expect, it, vi } from 'vitest';
import { build } from 'esbuild';
import { buildNavigationGraph, serveToAgent } from '../src/index.js';
import type { JourneyToolsPort } from '../src/index.js';
import { registerWebMcpTools } from '../src/webmcp.js';
import type { WebMcpContext, WebMcpTool } from '../src/webmcp.js';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

/** A browser registration surface, including signal-owned removal. */
class Registry implements WebMcpContext {
  readonly tools = new Map<string, WebMcpTool>();
  registerTool(tool: WebMcpTool, { signal }: { signal: AbortSignal }): void {
    if (this.tools.has(tool.name)) throw new Error('duplicate tool');
    this.tools.set(tool.name, tool);
    signal.addEventListener('abort', () => this.tools.delete(tool.name), { once: true });
  }
  execute(name: string, input: unknown) {
    const tool = this.tools.get(name);
    if (!tool) throw new Error('not registered');
    return tool.execute(input);
  }
}

function fixture() {
  const session = buildNavigationGraph('shop', {
    pages: { home: { actions: {
      read: { does: 'Read the count' },
      buy: { does: 'Buy', confirm: true, writes: ['orders'] },
    } } },
  }).createSession({ node: 'home', state: { orders: 0 }, requireHumanApproval: true, onWarn: () => undefined });
  let reads = 0;
  let orders = 0;
  const unmount = session.registerActions('home', { handlers: {
    read: () => { reads += 1; return { count: reads }; },
    buy: () => { orders += 1; session.updateState({ orders }); },
  } });
  return { session, unmount, port: serveToAgent(session), counts: () => ({ reads, orders }) };
}

function fakePort(): JourneyToolsPort {
  return {
    tools: () => [
      { name: 'one', description: 'First', inputSchema: { type: 'object', properties: { id: { type: 'string' } } } },
      { name: 'two', description: 'Second', inputSchema: { type: 'object' } },
    ],
    call: vi.fn((name, input) => ({ name, input })),
  };
}

describe('WebMCP delegates to the existing guarded serving port', () => {
  it('registers the same schemas and routes actual session actions with pending/settled truth intact', async () => {
    const { session, port, counts } = fixture();
    const browser = new Registry();
    const registration = await registerWebMcpTools(port, browser);
    expect([...browser.tools.values()].map(({ name, description, inputSchema }) => ({ name, description, inputSchema }))).toEqual(port.tools());
    const result = await browser.execute('shop.do_action', { action: 'read' });
    expect(result).toMatchObject({ ok: true, did: 'home.read' });
    expect(counts()).toEqual({ reads: 1, orders: 0 });
    const id = result['transitionId'] as string;
    await port.whenSettled!(id);
    const settled = await browser.execute('shop.did_it_work', { transitionId: id });
    expect(settled).toEqual(port.call('shop.did_it_work', { transitionId: id }));
    expect(settled['judgment']).not.toBe('pending');
    expect(session.transitions().filter((row) => row.cause.affordanceId === 'home.read')).toHaveLength(1);
    registration.dispose();
  });

  it('cannot manufacture human approval, and uses a real approval only once', async () => {
    const { session, port, counts } = fixture();
    const browser = new Registry();
    await registerWebMcpTools(port, browser);
    const refused = await browser.execute('shop.do_action', { action: 'buy', confirm: true });
    expect(refused).toMatchObject({ ok: false, reason: 'APPROVAL_REQUIRED', performed: false });
    expect(counts().orders).toBe(0);
    const askId = refused['askId'] as string;
    expect(typeof askId).toBe('string');
    session.approveAsk(askId, { by: 'local-test-human' });
    const result = await browser.execute('shop.do_action', { action: 'buy', confirm: true });
    expect(result).toMatchObject({ ok: true, did: 'home.buy' });
    await port.whenSettled!(result['transitionId'] as string);
    expect(counts().orders).toBe(1);
    expect(await browser.execute('shop.do_action', { action: 'buy', confirm: true })).toMatchObject({ ok: false, reason: 'APPROVAL_SPENT' });
    expect(counts().orders).toBe(1);
  });

  it('rechecks live handler materialization instead of holding a callable action snapshot', async () => {
    const { port, unmount, counts } = fixture();
    const browser = new Registry();
    await registerWebMcpTools(port, browser);
    unmount.unregister();
    expect(await browser.execute('shop.do_action', { action: 'read' })).toMatchObject({ ok: false, reason: 'NOT_MATERIALIZED' });
    expect(counts().reads).toBe(0);
  });

  it('retains the existing stale-offer refusal after an external update', async () => {
    const session = buildNavigationGraph('desk', { pages: { home: { actions: {
      save: { does: 'Save', reads: ['total'], freshness: { readChanges: 'refuse' } },
    } } } }).createSession({ node: 'home', state: { total: 1 } });
    let runs = 0;
    session.registerActions('home', { handlers: { save: () => { runs += 1; } } });
    const port = serveToAgent(session);
    const browser = new Registry();
    await registerWebMcpTools(port, browser);
    const here = await browser.execute('desk.whats_here', {});
    const actions = here['actions'] as { offerId: string }[];
    const input = { action: 'save', offerId: actions[0].offerId };
    session.updateState({ total: 2 }, { stimulus: 'push' });
    const refused = await browser.execute('desk.do_action', input);
    expect(refused).toMatchObject({ ok: false, reason: 'WORLD_MOVED' });
    expect(refused).toEqual(port.call('desk.do_action', input));
    expect(runs).toBe(0);
  });

  it('keeps two independent sessions and their approvals isolated', async () => {
    const a = fixture();
    const b = fixture();
    const first = new Registry();
    const second = new Registry();
    await registerWebMcpTools(a.port, first);
    await registerWebMcpTools(b.port, second);
    await first.execute('shop.do_action', { action: 'read' });
    expect(a.counts().reads).toBe(1);
    expect(b.counts().reads).toBe(0);
    expect(b.session.transitions().some((row) => row.cause.kind === 'fired')).toBe(false);
    expect(await second.execute('shop.do_action', { action: 'buy', confirm: true })).toMatchObject({ reason: 'APPROVAL_REQUIRED' });
    expect(a.session.confirms()).toHaveLength(0);
  });

  it('does not turn an in-flight action into a cancellation or pretend it was never dispatched', async () => {
    const session = buildNavigationGraph('slow', { pages: { home: { actions: { save: { does: 'Save' } } } } }).createSession({ node: 'home', state: {} });
    const done = deferred<{ saved: boolean }>();
    session.registerActions('home', { handlers: { save: () => done.promise } });
    const port = serveToAgent(session);
    const browser = new Registry();
    const registration = await registerWebMcpTools(port, browser);
    const callback = browser.tools.get('slow.do_action')!;
    const result = await callback.execute({ action: 'save' });
    expect(result).toMatchObject({ ok: true, effectStatus: 'pending' });
    registration.dispose();
    done.resolve({ saved: true });
    const settled = await port.whenSettled!(result['transitionId'] as string);
    expect(settled).toMatchObject({ produced: { saved: true } });
    await expect(callback.execute({ action: 'save' })).rejects.toThrow('not active');
  });
});

describe('WebMCP registration owns only its callbacks and lifecycle', () => {
  it('handles async registration, preserving the context receiver', async () => {
    const registry = new Registry();
    const context = { calls: 0, async registerTool(tool: WebMcpTool, options: { signal: AbortSignal }) {
      this.calls += 1;
      await Promise.resolve();
      registry.registerTool(tool, options);
    } };
    const port = fakePort();
    await registerWebMcpTools(port, context, {});
    expect(context.calls).toBe(2);
    expect(await registry.execute('two', { arbitrary: { retained: true } })).toEqual({ name: 'two', input: { arbitrary: { retained: true } } });
  });

  it('clones metadata and captures the name before a host mutates a descriptor', async () => {
    const port = fakePort();
    const original = port.tools();
    port.tools = () => original;
    const callbacks: WebMcpTool[] = [];
    await registerWebMcpTools(port, { registerTool(tool) {
      callbacks.push(tool);
      tool.name = 'host-mutated';
      tool.inputSchema['description'] = 'host-mutated';
    } });
    expect(original[0].name).toBe('one');
    expect(original[0].inputSchema).not.toHaveProperty('description');
    expect(await callbacks[0].execute({})).toEqual({ name: 'one', input: {} });
  });

  it('disposes idempotently, removes only this group, and rejects a retained callback', async () => {
    const registry = new Registry();
    const unrelated = { name: 'unrelated', description: 'Other owner', inputSchema: { type: 'object' as const }, execute: async () => ({ ok: true }) };
    registry.registerTool(unrelated, { signal: new AbortController().signal });
    const port = fakePort();
    const registration = await registerWebMcpTools(port, registry);
    const retained = registry.tools.get('one')!;
    registration.dispose();
    registration.dispose();
    expect([...registry.tools.keys()]).toEqual(['unrelated']);
    await expect(retained.execute({})).rejects.toThrow('no action was dispatched');
    expect(port.call).not.toHaveBeenCalled();
  });

  it('keeps callbacks inactive until the last registration succeeds', async () => {
    const last = deferred<void>();
    const registry = new Registry();
    const port = fakePort();
    const registering = registerWebMcpTools(port, { registerTool(tool, options) {
      registry.registerTool(tool, options);
      if (tool.name === 'two') return last.promise;
    } });
    await Promise.resolve();
    await expect(registry.tools.get('one')!.execute({})).rejects.toThrow('not active');
    last.resolve();
    await registering;
    expect(await registry.execute('one', {})).toEqual({ name: 'one', input: {} });
  });

  it.each(['throw', 'reject'] as const)('rolls back a partial %s without affecting another owner', async (failure) => {
    const port = fakePort();
    const registry = new Registry();
    const external = new AbortController();
    let retained!: WebMcpTool;
    const error = new Error('host refused second registration');
    const registering = registerWebMcpTools(port, { registerTool(tool, options) {
      if (tool.name === 'two') {
        if (failure === 'throw') throw error;
        return Promise.reject(error);
      }
      retained = tool;
      registry.registerTool(tool, options);
    } }, { signal: external.signal });
    await expect(registering).rejects.toBe(error);
    expect(registry.tools.size).toBe(0);
    await expect(retained.execute({})).rejects.toThrow('not active');
    external.abort();
    expect(port.call).not.toHaveBeenCalled();
  });

  it('refuses an already-aborted owner without registering anything', async () => {
    const owner = new AbortController();
    owner.abort();
    const registerTool = vi.fn();
    await expect(registerWebMcpTools(fakePort(), { registerTool }, { signal: owner.signal })).rejects.toThrow('not active');
    expect(registerTool).not.toHaveBeenCalled();
  });

  it('an abort interrupts a host that never finishes registration, and consumes its eventual rejection', async () => {
    const owner = new AbortController();
    const host = deferred<void>();
    const registry = new Registry();
    const port = fakePort();
    const registering = registerWebMcpTools(port, { registerTool(tool, options) {
      registry.registerTool(tool, options);
      return host.promise;
    } }, { signal: owner.signal });
    owner.abort();
    await expect(registering).rejects.toThrow('not active');
    expect(registry.tools.size).toBe(0);
    host.reject(new Error('late host failure'));
    await Promise.resolve();
    expect(port.call).not.toHaveBeenCalled();
  });

  it('never activates when the host synchronously aborts the owner during registration', async () => {
    const owner = new AbortController();
    const port = fakePort();
    let retained!: WebMcpTool;
    await expect(registerWebMcpTools(port, { registerTool(tool) {
      retained = tool;
      owner.abort();
    } }, { signal: owner.signal })).rejects.toThrow('not active');
    await expect(retained.execute({})).rejects.toThrow('not active');
    expect(port.call).not.toHaveBeenCalled();
  });

  it('does not resurrect a settled registration when the owner aborts before the continuation', async () => {
    const owner = new AbortController();
    const last = deferred<void>();
    const callbacks: WebMcpTool[] = [];
    const port = fakePort();
    const registering = registerWebMcpTools(port, { registerTool(tool) {
      callbacks.push(tool);
      if (tool.name === 'two') return last.promise;
    } }, { signal: owner.signal });
    await Promise.resolve();
    last.resolve();
    queueMicrotask(() => owner.abort());
    await expect(registering).rejects.toThrow('not active');
    await expect(callbacks[0].execute({})).rejects.toThrow('not active');
    expect(port.call).not.toHaveBeenCalled();
  });

  it.each([true, false])('respects disposal during tool discovery (nonempty=%s)', async (nonempty) => {
    const owner = new AbortController();
    const port = fakePort();
    const tools = port.tools();
    port.tools = () => { owner.abort(); return nonempty ? tools : []; };
    const registerTool = vi.fn();
    await expect(registerWebMcpTools(port, { registerTool }, { signal: owner.signal })).rejects.toThrow('not active');
    expect(registerTool).not.toHaveBeenCalled();
    expect(port.call).not.toHaveBeenCalled();
  });

  it('checks per-execution cancellation before dispatch, without parsing content', async () => {
    const port = fakePort();
    const registry = new Registry();
    await registerWebMcpTools(port, registry);
    const tool = registry.tools.get('one')!;
    const cancelled = new AbortController();
    cancelled.abort();
    await expect(tool.execute({}, { signal: cancelled.signal })).rejects.toThrow('not active');
    expect(port.call).not.toHaveBeenCalled();
    expect(await tool.execute({ extra: true }, {})).toEqual({ name: 'one', input: { extra: true } });
  });

  it('keeps a dispatched result even when the handler disposes the registration', async () => {
    const port = fakePort();
    const registry = new Registry();
    const registration = await registerWebMcpTools(port, registry);
    const retained = registry.tools.get('one')!;
    port.call = () => { registration.dispose(); return { ok: true, alreadyExecuted: true }; };
    expect(await retained.execute({})).toEqual({ ok: true, alreadyExecuted: true });
    await expect(retained.execute({})).rejects.toThrow('not active');
  });

  it('safely supports an empty port and fails closed when snapshotting fails', async () => {
    const registry = new Registry();
    const empty = fakePort();
    empty.tools = () => [];
    (await registerWebMcpTools(empty, registry)).dispose();
    const broken = fakePort();
    broken.tools = () => { throw new Error('snapshot failed'); };
    await expect(registerWebMcpTools(broken, registry)).rejects.toThrow('snapshot failed');
    expect(registry.tools.size).toBe(0);
  });

  it('unregisters on later external abort even if the options object was mutated', async () => {
    const owner = new AbortController();
    const options = { signal: owner.signal };
    const registry = new Registry();
    const port = fakePort();
    const registration = await registerWebMcpTools(port, registry, options);
    options.signal = new AbortController().signal;
    owner.abort();
    registration.dispose();
    expect(registry.tools.size).toBe(0);
  });
});

describe('optional entry-point isolation', () => {
  it('bundles the browser bridge without a runtime, React, MCP SDK or browser globals', async () => {
    const result = await build({ entryPoints: ['src/webmcp.ts'], bundle: true, platform: 'browser', format: 'esm', write: false, metafile: true });
    expect(Object.keys(result.metafile!.inputs).sort()).toEqual(['src/serve/webmcp.ts', 'src/webmcp.ts']);
    expect(result.outputFiles[0].text).not.toMatch(/navigator\.|document\./);
  });
});
