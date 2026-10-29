import { createElement, StrictMode, Suspense, useEffect } from 'react';
import { act, create } from 'react-test-renderer';
import type { ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it } from 'vitest';
import type { JourneyToolsPort } from '../src/index.js';
import { registerWebMcpTools } from '../src/webmcp.js';
import type { WebMcpContext, WebMcpTool } from '../src/webmcp.js';
import './react-fixture.js';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((yes) => { resolve = yes; });
  return { promise, resolve };
}

interface Entry {
  tool: WebMcpTool;
  signal: AbortSignal;
}

/** Browser lifetime semantics, with optional slow registration. */
class Registry implements WebMcpContext {
  readonly tools = new Map<string, Entry>();
  readonly registrations: Entry[] = [];

  constructor(private readonly wait?: (index: number) => Promise<void> | void) {}

  registerTool(tool: WebMcpTool, { signal }: { signal: AbortSignal }): Promise<void> | void {
    if (this.tools.has(tool.name)) throw new Error('duplicate tool');
    const entry = { tool, signal };
    const index = this.registrations.length;
    this.registrations.push(entry);
    this.tools.set(tool.name, entry);
    signal.addEventListener('abort', () => {
      if (this.tools.get(tool.name) === entry) this.tools.delete(tool.name);
    }, { once: true });
    return this.wait?.(index);
  }
}

function port(id: string): JourneyToolsPort {
  return {
    tools: () => [{ name: 'app.read', description: 'Read the current session', inputSchema: { type: 'object' } }],
    call: () => ({ id }),
  };
}

interface Props {
  port: JourneyToolsPort;
  context: WebMcpContext;
  onError: (error: unknown) => void;
  suspend?: Promise<void>;
}

/** The app's effect, not a new public hook or a second registration owner. */
function RegistrationEffect({ port, context, onError, suspend }: Props): null {
  useEffect(() => {
    const owner = new AbortController();
    void registerWebMcpTools(port, context, { signal: owner.signal }).catch((error: unknown) => {
      if (!owner.signal.aborted) onError(error);
    });
    // Cleanup exists before async initialization has a chance to finish.
    return () => owner.abort();
  }, [port, context, onError]);
  if (suspend) throw suspend;
  return null;
}

describe('the optional bridge follows the committed React owner', () => {
  it('StrictMode cancels unfinished setup and remounts one usable registration', async () => {
    const first = deferred();
    const context = new Registry((index) => index === 0 ? first.promise : undefined);
    const errors: unknown[] = [];
    const onError = (error: unknown) => { errors.push(error); };
    let tree!: ReactTestRenderer;
    await act(async () => {
      tree = create(createElement(StrictMode, null,
        createElement(RegistrationEffect, { port: port('current'), context, onError })));
    });
    // Prove React actually replayed an effect, without depending on an exact
    // render count. Its discarded setup is inactive; the current one works.
    const discarded = context.registrations.filter((entry) => entry.signal.aborted);
    expect(discarded.length).toBeGreaterThan(0);
    expect(context.tools.size).toBe(1);
    expect(await context.tools.get('app.read')!.tool.execute({})).toEqual({ id: 'current' });
    for (const entry of discarded) await expect(entry.tool.execute({})).rejects.toThrow('not active');
    await act(async () => { first.resolve(); });
    expect(context.tools.size).toBe(1);
    expect(await context.tools.get('app.read')!.tool.execute({})).toEqual({ id: 'current' });
    await act(async () => tree.unmount());
    expect(context.tools.size).toBe(0);
    expect(errors).toEqual([]);
  });

  it('unmounts before initialization completes without leaking or activating a late callback', async () => {
    const ready = deferred();
    const context = new Registry(() => ready.promise);
    const errors: unknown[] = [];
    const onError = (error: unknown) => { errors.push(error); };
    let tree!: ReactTestRenderer;
    await act(async () => {
      tree = create(createElement(RegistrationEffect, { port: port('gone'), context, onError }));
    });
    const retained = context.registrations[0].tool;
    await expect(retained.execute({})).rejects.toThrow('not active');
    await act(async () => tree.unmount());
    expect(context.tools.size).toBe(0);
    await act(async () => { ready.resolve(); });
    await expect(retained.execute({})).rejects.toThrow('not active');
    expect(context.tools.size).toBe(0);
    expect(errors).toEqual([]);
  });

  it('replaces a committed port without retaining an executable stale closure', async () => {
    const context = new Registry();
    const errors: unknown[] = [];
    const onError = (error: unknown) => { errors.push(error); };
    let tree!: ReactTestRenderer;
    await act(async () => {
      tree = create(createElement(RegistrationEffect, { port: port('first'), context, onError }));
    });
    const old = context.tools.get('app.read')!.tool;
    expect(await old.execute({})).toEqual({ id: 'first' });
    await act(async () => {
      tree.update(createElement(RegistrationEffect, { port: port('second'), context, onError }));
    });
    expect(context.tools.size).toBe(1);
    await expect(old.execute({})).rejects.toThrow('not active');
    expect(await context.tools.get('app.read')!.tool.execute({})).toEqual({ id: 'second' });
    await act(async () => tree.unmount());
    expect(context.tools.size).toBe(0);
    expect(errors).toEqual([]);
  });

  it('never registers from a suspended render that does not commit', async () => {
    const waiting = deferred();
    const context = new Registry();
    const errors: unknown[] = [];
    const onError = (error: unknown) => { errors.push(error); };
    let tree!: ReactTestRenderer;
    await act(async () => {
      tree = create(createElement(Suspense, { fallback: null },
        createElement(RegistrationEffect, { port: port('uncommitted'), context, onError, suspend: waiting.promise })));
    });
    expect(context.registrations).toEqual([]);
    expect(context.tools.size).toBe(0);
    await act(async () => tree.unmount());
    expect(errors).toEqual([]);
  });

  it('reports a real registration failure and leaves the other owner intact', async () => {
    const context = new Registry();
    const otherOwner = new AbortController();
    const otherTool: WebMcpTool = {
      name: 'app.read', description: 'Already owned', inputSchema: { type: 'object' },
      execute: async () => ({ owner: 'other' }),
    };
    context.registerTool(otherTool, { signal: otherOwner.signal });
    const errors: unknown[] = [];
    const onError = (error: unknown) => { errors.push(error); };
    let tree!: ReactTestRenderer;
    await act(async () => {
      tree = create(createElement(RegistrationEffect, { port: port('new'), context, onError }));
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(Error);
    expect((errors[0] as Error).message).toBe('duplicate tool');
    await act(async () => tree.unmount());
    expect(context.tools.get('app.read')!.tool).toBe(otherTool);
    expect(await otherTool.execute({})).toEqual({ owner: 'other' });
    otherOwner.abort();
  });
});
