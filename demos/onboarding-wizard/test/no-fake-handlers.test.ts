import { describe, expect, it } from 'vitest';

import { buildOnboardingGraph } from '../src/app/graph.js';
import { pageHandlers } from '../src/app/mounts.js';
import { createRouter } from '../src/app/router.js';
import { settle } from '../src/app/settle.js';
import { createWizardStore } from '../src/app/store.js';
import { createWizardApp } from '../src/app/wizard.js';

/**
 * t2 — THE DELETION PROOF.
 *
 * The category of glue this demo exists to kill is the fake do-nothing handler:
 * a function registered for a pure navigation purely so an agent fire would get
 * past NOT_MATERIALIZED. This app registers none, and its navigation works.
 *
 * The mutation half is the second block: the SAME graph, the SAME tool, the
 * SAME agent fire, with only the `navigate` option withheld — and the fire is
 * refused. That is what the code looked like before the actuation layer
 * existed, so this file fails against it, which is the only way a proof of a
 * deletion can be honest.
 */
describe('navigation with no handlers at all', () => {
  const NAV_TOOLS = [
    'to-profile',
    'to-plan',
    'to-review',
    'back-to-welcome',
    'back-to-profile',
    'back-to-plan',
  ];

  it('registers a handler for exactly the four tools that CHANGE something', () => {
    const handlers = pageHandlers(createWizardStore(), createRouter('/'));
    const names = Object.values(handlers).flatMap((page) => Object.keys(page));
    expect(names.sort()).toEqual(['choose-plan', 'confirm-signup', 'save-profile', 'verify-email']);
    for (const nav of NAV_TOOLS) expect(names, nav).not.toContain(nav);
  });

  it('declares those navigations in the graph anyway — they exist, nothing is bound to them', () => {
    const graph = buildOnboardingGraph();
    for (const nav of NAV_TOOLS) {
      const id = Object.keys(graph.spec.affordances).find((key) => key.endsWith(`.${nav}`));
      expect(id, nav).toBeDefined();
      expect(graph.spec.affordances[id ?? '']?.effect?.navigatesTo, nav).toBeDefined();
    }
  });

  it('performs an agent navigation through the app’s own router, with nothing registered', async () => {
    const app = createWizardApp();
    // Prove the premise on the LIVE session: the edge is materialisable, and it
    // is not because a handler mounted — the mounted group is welcome's, and
    // welcome's only handler is verify-email.
    const before = app.session.available().edges.find((e) => e.affordanceId === 'welcome.to-profile');
    expect(before?.materialized).toBe(true);

    const fired = app.session.fire('welcome.to-profile', { source: 'agent' });
    expect(fired.ok).toBe(true);
    if (!fired.ok) return;
    // The cursor moved on a CLAIM the moment it fired; nothing had run yet.
    expect(fired.transition.toNodeClaimed).toBe(true);
    expect(fired.effectStatus).toBe('pending');

    // …and the synthesized navigation rides the same invocation machinery a
    // registered handler does, so it settles the same way.
    const settled = await fired.whenSettled;
    expect(settled.effectStatus).toBe('performed');

    await settle();
    expect(app.router.path()).toBe('/profile');
    expect(app.session.node).toBe('profile');
    expect(app.mounts.mountedPage()).toBe('profile');
    app.destroy();
  });

  it('MUTATION PROOF: withhold the navigate option and the identical fire is refused', async () => {
    const graph = buildOnboardingGraph();
    const state = { emailVerified: false, profileComplete: false, plan: '', signedUp: false };
    const router = createRouter('/');

    const withNavigate = graph.createSession({
      node: 'welcome',
      state,
      navigate: (href) => router.push(href),
    });
    const withoutNavigate = graph.createSession({ node: 'welcome', state });

    // Neither session has a single registration. The ONLY difference is the option.
    const armed = withNavigate.fire('welcome.to-profile', { source: 'agent' });
    const bare = withoutNavigate.fire('welcome.to-profile', { source: 'agent' });

    expect(armed.ok).toBe(true);
    if (bare.ok || bare.reason !== 'NOT_MATERIALIZED') {
      throw new Error(`expected NOT_MATERIALIZED, got ${JSON.stringify(bare)}`);
    }
    expect(bare.affordanceId).toBe('welcome.to-profile');

    await settle();
    expect(router.path()).toBe('/profile'); // the armed session really moved the app
    expect(withoutNavigate.node).toBe('welcome'); // the bare one never left
  });

  it('never invents an address for a gesture that is not one: a click stays refused, and says so', () => {
    const graph = buildOnboardingGraph();
    const router = createRouter('/');
    const session = graph.createSession({
      node: 'welcome',
      state: { emailVerified: true, profileComplete: false, plan: '', signedUp: false },
      navigate: (href) => router.push(href),
    });

    const refused = session.fire('welcome.import-from-google', { source: 'agent' });
    if (refused.ok || refused.reason !== 'NOT_MATERIALIZED') {
      throw new Error(`expected NOT_MATERIALIZED, got ${JSON.stringify(refused)}`);
    }
    // The refusal names the wiring that is missing instead of saying "nothing
    // is bound": this is a click on a button somebody has to write.
    expect(refused.gesture).toEqual({
      kind: 'element',
      locator: { role: 'button', name: 'Import from Google' },
      actuation: 'click',
    });
    expect(router.path()).toBe('/'); // and the app did not move an inch
  });
});
