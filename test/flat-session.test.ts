/**
 * The FLAT Session — the graph without the container tree.
 *
 * `InteractionSession` is the door almost everyone uses, and it overrides three
 * seams of its parent: which rows may serve a value (`servesHolds`), what "the
 * served structure" is (`structureFingerprint`), and how a mount handle maps an
 * action id. That means the base implementations are only ever exercised by a
 * consumer who reaches for `new Session(spec)` directly — a flat graph, ids
 * bound by name, no pages nested inside pages. This file is that consumer.
 *
 * Everything here is a guarantee the flat door makes on its own: a value reader
 * is served (there is no repeats container to hold it back), a bind/unbind is
 * world motion the cursor records, and a subclass gets working defaults for the
 * handle it builds.
 *
 * Mutation proofs: make the base `servesHolds` answer false and the value
 * disappears from a flat row; drop `busy`/`enabled` from the base fingerprint
 * and the setEnabled case below stops recording a structure swap.
 */
import { describe, expect, it } from 'vitest';
import { Session, buildNavigationGraph, serveToAgent } from '../src/index.js';
import type { ActionGroup } from '../src/index.js';

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

const deskSpec = () =>
  buildNavigationGraph('desk', {
    pages: {
      compose: {
        actions: {
          send: { does: 'Send the message', writes: ['sent'] },
          draft: { does: 'Save a draft' },
        },
      },
    },
  }).spec;

const flat = (onWarn: (message: string) => void = () => undefined): Session =>
  new Session(deskSpec(), { node: 'compose', state: {}, onWarn });

describe('what a control holds, on a graph with no container tree', () => {
  it('serves the value, because a flat row always stands for exactly one control', () => {
    const session = flat();
    session.declareHolds('compose.draft', () => 'half a sentence');
    const row = session.available().edges.find((e) => e.affordanceId === 'compose.draft');
    expect(row?.holds).toBe('half a sentence');
  });

  it('drops the reader the release was handed, and nothing else', () => {
    const session = flat();
    const releaseFirst = session.declareHolds('compose.draft', () => 'first');
    session.declareHolds('compose.draft', () => 'second');
    const holdsNow = (): unknown =>
      session.available().edges.find((e) => e.affordanceId === 'compose.draft')?.holds;

    expect(holdsNow()).toBe('second'); //     the newest declaration answers
    releaseFirst();
    expect(holdsNow()).toBe('second'); //     releasing the OLDER one changes nothing
    releaseFirst(); //                        and releasing it twice is not a second pop
    expect(holdsNow()).toBe('second');
  });

  it('goes back to saying nothing once every reader is released', () => {
    const session = flat();
    const release = session.declareHolds('compose.draft', () => 'a draft');
    release();
    const row = session.available().edges.find((e) => e.affordanceId === 'compose.draft');
    expect(row).not.toHaveProperty('holds');
  });
});

describe('binding and unbinding a flat graph’s handlers is world motion', () => {
  it('records a structure swap when a group binds, and again when it lets go', async () => {
    const session = flat();
    const bound = session.registerHandlers({
      group: 'composer',
      handlers: { 'compose.send': () => undefined },
    });
    await tick();
    expect(session.transitions().map((t) => t.cause.stimulus)).toContain('structure-swap');
    const afterBind = session.structureVersion;

    bound.unregister();
    await tick();
    expect(session.structureVersion).toBeGreaterThan(afterBind);
  });

  it('counts a greyed-out button as a changed surface, not as churn', async () => {
    const session = flat();
    const mounted = session.registerHandlers({
      group: 'composer',
      handlers: { 'compose.send': () => undefined },
    });
    await tick();
    const settled = session.structureVersion;

    // Nothing mounted or unmounted — the same control now refuses the click.
    mounted.setEnabled('compose.send', false);
    await tick();
    expect(session.structureVersion).toBeGreaterThan(settled);
    expect(session.available().edges.find((e) => e.affordanceId === 'compose.send')?.enabled).toBe(false);
  });

  it('a group governs only the controls it mounted — reaching past that is refused by name', () => {
    // Enablement belongs to whoever mounted the control. Without this, one
    // component could switch off another component's button and the owner would
    // have no way to know why its control stopped working.
    const session = flat();
    const composer = session.registerHandlers({
      group: 'composer',
      handlers: { 'compose.send': () => undefined },
    });
    session.registerHandlers({ group: 'drafts', handlers: { 'compose.draft': () => undefined } });

    expect(() => composer.setEnabled('compose.draft', false)).toThrow(/governs only what it mounted/);
    // …and the other group's control is untouched by the attempt.
    expect(session.available().edges.find((e) => e.affordanceId === 'compose.draft')?.enabled).toBeUndefined();
  });

  it('says nothing when a bind and an unbind cancel out inside one window', async () => {
    const session = flat();
    await tick(); // let the session's own opening flush pass
    const before = session.structureVersion;
    session.registerHandlers({ group: 'blink', handlers: { 'compose.send': () => undefined } }).unregister();
    await tick();
    // Net-zero churn — a StrictMode double-mount must not land in the trace.
    expect(session.structureVersion).toBe(before);
  });

  it('refuses to bind a handler to an action the graph never declared', () => {
    const session = flat();
    expect(() =>
      session.registerHandlers({ group: 'typo', handlers: { 'compose.sned': () => undefined } }),
    ).toThrow(/undeclared affordance\(s\) 'compose.sned'/);
  });

  /**
   * THE THIRD STATE, through the same door. A control is clickable, switched off
   * or WORKING. Two of the three had a wire on this handle and the third did
   * not — an asymmetry rather than a decision, and one with a consequence: the
   * React binding takes handles by their `setBusy`, so a flat-session app could
   * mount its controls here and then not drive `useWorking` with them at all.
   */
  it('the mounting door can say a control is working, not only that it is off', () => {
    const session = flat();
    const composer = session.registerHandlers({
      group: 'composer',
      handlers: { 'compose.send': () => undefined },
    });
    composer.setBusy('compose.send', 'Sending…');
    expect(session.available().edges.find((e) => e.affordanceId === 'compose.send')?.busy).toBe(
      'Sending…',
    );
    // …and undefined stops saying it, rather than saying "idle".
    composer.setBusy('compose.send', undefined);
    expect(
      session.available().edges.find((e) => e.affordanceId === 'compose.send')?.busy,
    ).toBeUndefined();
  });

  it('busy is scoped exactly as enablement is — one rule, not two', () => {
    const session = flat();
    const composer = session.registerHandlers({
      group: 'composer',
      handlers: { 'compose.send': () => undefined },
    });
    session.registerHandlers({ group: 'drafts', handlers: { 'compose.draft': () => undefined } });
    expect(() => composer.setBusy('compose.draft', 'Saving…')).toThrow(
      /governs only what it mounted/,
    );
    expect(
      session.available().edges.find((e) => e.affordanceId === 'compose.draft')?.busy,
    ).toBeUndefined();
  });

  it('the refusal names the verb that was refused, so two wires cannot read alike', () => {
    const session = flat();
    const composer = session.registerHandlers({
      group: 'composer',
      handlers: { 'compose.send': () => undefined },
    });
    expect(() => composer.setBusy('compose.draft', 'x')).toThrow(/cannot set busy on/);
    expect(() => composer.setEnabled('compose.draft', false)).toThrow(/cannot enable\/disable/);
  });
});

describe('the action-group handle a subclass builds for itself', () => {
  /**
   * `makeActionGroup` is `protected`: it exists for a session that extends this
   * one and wants the handle's plumbing without rewriting it. This subclass is
   * that consumer, and the guarantee is that the three defaults it does NOT
   * pass in still reach the session underneath.
   */
  class OpenSession extends Session {
    handleFor(group: string, node?: string): ActionGroup {
      return this.makeActionGroup(group, node);
    }
  }

  const openSession = (): OpenSession =>
    new OpenSession(deskSpec(), { node: 'compose', state: {}, onWarn: () => undefined });

  it('carries the group id and, when given one, the node it belongs to', () => {
    const session = openSession();
    expect(session.handleFor('g1', 'compose')).toMatchObject({ id: 'g1', node: 'compose' });
    // No node is a real answer on a flat graph — the key is absent, not empty.
    expect(session.handleFor('g2')).not.toHaveProperty('node');
  });

  it('wires setEnabled, setBusy and unregister straight through to the session', async () => {
    const session = openSession();
    const mounted = session.registerHandlers({
      group: 'composer',
      handlers: { 'compose.send': () => undefined },
    });
    const handle = session.handleFor('composer', 'compose');
    const rowFor = (): { enabled?: boolean; busy?: string } | undefined =>
      session.available().edges.find((e) => e.affordanceId === 'compose.send');

    handle.setEnabled('compose.send', false);
    expect(rowFor()?.enabled).toBe(false);

    handle.setBusy('compose.send', 'Sending…');
    expect(rowFor()?.busy).toBe('Sending…');

    handle.unregister();
    await tick();
    // The handle let go of the binding the session was holding, so there is
    // nothing left to execute the fire.
    expect(session.fire('compose.send', { source: 'agent' })).toMatchObject({
      ok: false,
      reason: 'NOT_MATERIALIZED',
    });
  });
});

describe('position on a graph with no container tree', () => {
  /**
   * `lookingAt` is the served half of "where inside the current node the reader
   * is", and the flat door answers it honestly by having nothing to answer:
   * there is no container tree, so there is nothing below a page for anyone to
   * be in. `observeFocus` is the tree layer's door and does not exist here.
   *
   * MUTATION PROOF: make the base getter return `this.node` and the served
   * result grows a `lookingAt` that merely repeats `youAreOn` — a second
   * position that says nothing, handed to a model as if it did.
   */
  it('says nothing below the page, and serves no lookingAt beside youAreOn', () => {
    const session = flat();
    expect(session.lookingAt).toBeNull();

    const here = serveToAgent(session).call('desk.whats_here', {});
    expect(here['youAreOn']).toBe('compose');
    expect(here).not.toHaveProperty('lookingAt');
  });
});
