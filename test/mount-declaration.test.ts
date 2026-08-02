/**
 * WHAT A COMPONENT MAY SAY AS IT MOUNTS — and what the mount door refuses.
 *
 * There are two authoring doors into one graph. `buildNavigationGraph` is the
 * one an author writes ahead of time; `registerActions({ actions })` is the one
 * a component walks through as it renders, for the control that does not exist
 * until something is on screen. They compile into the SAME affordance shape and
 * they are read by the same servers — so a rule enforced at one door and not
 * the other is not a smaller rule, it is a hole with a nice error message next
 * to it.
 *
 * This file pins both halves of that:
 *
 * THE LAW IS THE SAME AT BOTH DOORS. A reserved name, a reserved character, a
 * missing `does`, an empty `when {}`, a `goTo` naming a page nobody declared —
 * each is refused AT MOUNT, in this library's own sentence, rather than
 * compiling into a served row that lies later.
 *
 * THE DECLARATION IS THE WHOLE DECLARATION. A mount-declared action is not a
 * description with a handler stapled on: its `when` composes with every
 * ancestor container's `when` exactly as a built one does, its `writes` is
 * checked against what the app reports, its `goTo` becomes the row's
 * `navigatesTo`, its binding is CLONED so the overlay owns its bytes, and its
 * `verify` is enforced at settlement — declarative or predicate.
 *
 * The limit worth naming: mount-declaring an id the graph already declares does
 * NOT overwrite it (the central declaration is the audited one) — that
 * precedence is pinned in nav-session.test.ts, and everything here is about the
 * ids only the render knows.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph } from '../src/index.js';
import type { LiveSource, NavigationGraph } from '../src/index.js';
import { okUpdate } from './fixture.js';

/** A mail app whose compose area only exists while a draft is open. */
function mailMap(): NavigationGraph {
  return buildNavigationGraph('mail', {
    pages: {
      inbox: {
        areas: {
          compose: { does: 'The compose pane', when: { draftOpen: { eq: true } } },
        },
      },
      settings: { does: 'Account settings' },
    },
  });
}

function served(session: { available(): { edges: { affordanceId: string }[] } }): string[] {
  return session.available().edges.map((edge) => edge.affordanceId).sort();
}

/** A session whose compose pane is open and whose guard keys are all seeded. */
function open(state: Record<string, unknown> = {}) {
  return mailMap().createSession({
    state: { draftOpen: true, recipient: 'ada@example.com', ...state },
    onWarn: () => undefined,
  });
}

describe('the mount door enforces the same authoring law as the build door', () => {
  it('refuses a name carrying a reserved path character, naming the characters it reserves', () => {
    const session = open();
    expect(() =>
      session.registerActions('inbox.compose', { actions: { 'send.now': { does: 'Send the message' } } }),
    ).toThrow(/action 'send\.now' contains a reserved character \(\. \[ \] # \/ \|\)/);
  });

  it("refuses 'leave-journey' here too — the escape tool's name is reserved at every door", () => {
    const session = open();
    expect(() =>
      session.registerActions('inbox.compose', { actions: { 'leave-journey': { does: 'Abandon this' } } }),
    ).toThrow(/'leave-journey' is reserved/);
  });

  it('refuses an action with no `does` — the one authored string is what both readers read', () => {
    const session = open();
    expect(() =>
      session.registerActions('inbox.compose', { actions: { send: { does: '   ' } } }),
    ).toThrow(/'inbox\.compose\.send' needs a 'does'/);
  });

  it('refuses an empty `when {}` with the correction, rather than serving a control nothing can free', () => {
    const session = open();
    expect(() =>
      session.registerActions('inbox.compose', { actions: { send: { does: 'Send it', when: {} } } }),
    ).toThrow(/empty when \{\} — omit it/);
  });

  it('refuses a `goTo` naming a page the graph does not have, at mount time', () => {
    const session = open();
    expect(() =>
      session.registerActions('inbox.compose', {
        actions: { escape: { does: 'Leave', goTo: 'nowhere' } },
      }),
    ).toThrow(/goTo unknown page 'nowhere'/);
  });

  it('refuses an instance key on a node that does not repeat — instance keys mean cards', () => {
    const session = open();
    expect(() => session.registerActions('inbox.compose', { instance: 'draft-7' })).toThrow(
      /'inbox\.compose' is not repeats: true/,
    );
  });

  it('refuses a visibility signal for a node the graph never declared, and lists the ones it has', () => {
    const session = open();
    expect(() => session.setVisible('inbox.ghost', true)).toThrow(/unknown node 'inbox\.ghost'/);
    expect(() => session.show('inbox.ghost')).toThrow(/Known nodes: inbox, inbox\.compose, settings/);
  });
});

describe('a mount-declared action carries its whole declaration, not just its name', () => {
  it('composes its `when` with every ancestor container `when` — both must hold before it is offered', () => {
    const session = mailMap().createSession({
      state: { draftOpen: false, recipient: '' },
      onWarn: () => undefined,
    });
    session.registerActions('inbox.compose', {
      actions: { send: { does: 'Send the message', when: { recipient: { ne: '' } } } },
    });
    expect(served(session)).not.toContain('inbox.compose.send');

    session.updateState({ recipient: 'ada@example.com' }, { stimulus: 'push' });
    expect(served(session)).not.toContain('inbox.compose.send'); // the container still holds it back

    session.updateState({ draftOpen: true }, { stimulus: 'push' });
    expect(served(session)).toContain('inbox.compose.send'); // both conditions hold

    session.updateState({ recipient: '' }, { stimulus: 'push' });
    expect(served(session)).not.toContain('inbox.compose.send'); // its own condition closes it again
  });

  it('has its `writes` checked against what the app reports, exactly like a built action', () => {
    const session = open({ sentCount: 0 });
    session.registerActions('inbox.compose', {
      actions: { send: { does: 'Send the message', writes: ['sentCount'] } },
    });

    expect(session.fire('inbox.compose.send', { source: 'user' })).toMatchObject({
      ok: true,
      settlement: 'awaiting-state',
    });
    expect(okUpdate(session.updateState({ sentCount: 1 })).transition.effectVerified).toBe(true);

    // A claim is a claim: a report that never carries the key fails it.
    session.fire('inbox.compose.send', { source: 'user' });
    expect(okUpdate(session.updateState({ lastError: 'none' })).transition.effectVerified).toBe(false);
  });

  it("turns its `goTo` into the row's navigatesTo, and the control's role into 'next'", () => {
    const session = open();
    session.registerActions('inbox.compose', {
      actions: { 'open-settings': { does: 'Open account settings', goTo: 'settings' } },
    });
    const edge = session.available().edges.find((e) => e.affordanceId === 'inbox.compose.open-settings');
    expect(edge).toMatchObject({ navigatesTo: 'settings', role: 'next' });
  });

  it('serves its binding by value — the overlay owns its bytes, not the caller’s object', () => {
    const session = open();
    const binding = {
      kind: 'element' as const,
      locator: { role: 'button' as const, name: 'Send' },
      actuation: 'click' as const,
    };
    session.registerActions('inbox.compose', {
      actions: { send: { does: 'Send the message', binding } },
    });
    const edge = session.available().edges.find((e) => e.affordanceId === 'inbox.compose.send');
    expect(edge?.binding).toEqual(binding);
    expect(edge?.binding).not.toBe(binding);
  });

  it('enforces its `verify` at settlement — a filter over state, or the app’s own predicate', async () => {
    const session = open({ sent: false });
    let asked = 0;
    session.registerActions('inbox.compose', {
      actions: {
        send: { does: 'Send the message', verify: { sent: { eq: true } }, handler: () => undefined },
        archive: {
          does: 'Archive the thread',
          verify: () => {
            asked += 1;
            return false;
          },
          handler: () => undefined,
        },
      },
    });

    const bySpec = session.fire('inbox.compose.send', { source: 'user' });
    expect(bySpec.ok).toBe(true);
    expect(await (bySpec as { whenSettled: Promise<{ verifyHeld?: boolean }> }).whenSettled).toMatchObject({
      verifyHeld: false,
      effectStatus: 'refused',
    });

    const byPredicate = session.fire('inbox.compose.archive', { source: 'user' });
    expect(byPredicate.ok).toBe(true);
    expect(await (byPredicate as { whenSettled: Promise<{ verifyHeld?: boolean }> }).whenSettled).toMatchObject({
      verifyHeld: false,
    });
    expect(asked).toBe(1); // the predicate is CALLED, not cloned into a filter
  });
});

describe('releasing what a mount declared', () => {
  it('is idempotent — a double cleanup cannot take a twin component’s declaration with it', () => {
    const session = open();
    const first = session.registerActions('inbox.compose', {
      actions: { send: { does: 'Send the message' } },
    });
    const twin = session.registerActions('inbox.compose', {
      actions: { send: { does: 'Send the message (twin)' } },
    });

    first.unregister();
    first.unregister(); // React StrictMode's second cleanup
    expect(served(session)).toContain('inbox.compose.send'); // the twin still serves it

    twin.unregister();
    expect(served(session)).not.toContain('inbox.compose.send');
  });

  it('keeps a mount-declared action tied to its page: the router moving on retires it', () => {
    const session = open();
    session.registerActions('inbox.compose', {
      actions: { send: { does: 'Send the message', handler: () => undefined } },
    });
    expect(served(session)).toContain('inbox.compose.send');

    session.sync('settings');
    expect(served(session)).not.toContain('inbox.compose.send');
    expect(session.fire('inbox.compose.send', { source: 'agent' })).toMatchObject({
      ok: false,
      reason: 'NOT_ON_NODE',
      node: 'settings',
    });
  });
});

describe('a live source that misbehaves on the way out', () => {
  it('cannot break the session: a detach that throws is warned about, and the ledger still drains', () => {
    const warnings: string[] = [];
    const exploding: LiveSource = {
      kind: 'live',
      attach: () => () => {
        throw new Error('store already torn down');
      },
    };
    const session = buildNavigationGraph('mail', {
      pages: { inbox: { does: 'Inbox' } },
      sources: [exploding],
    }).createSession({ onWarn: (message) => warnings.push(message) });

    expect(() => session.detachSources()).not.toThrow();
    expect(warnings).toEqual([
      expect.stringContaining("a live source's detach threw: Error: store already torn down"),
    ]);

    warnings.length = 0;
    session.detachSources(); // drained on the first call — nothing left to throw
    expect(warnings).toEqual([]);
  });
});
