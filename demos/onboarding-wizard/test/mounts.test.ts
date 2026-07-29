import { describe, expect, it } from 'vitest';

import { settle } from '../src/app/settle.js';
import { createWizardApp } from '../src/app/wizard.js';

/**
 * One page's handlers at a time — which is what makes the session's
 * `materialized` stamp mean "something on screen can do this" rather than
 * "somebody once wrote a function for this".
 */
describe('the mount controller', () => {
  it('mounts the page the router landed on, and only that one', async () => {
    const app = createWizardApp();
    expect(app.mounts.mountedPage()).toBe('welcome');

    app.router.push('/plan');
    await settle();
    expect(app.mounts.mountedPage()).toBe('plan');

    // The previous page's tool is not on this page at all, and the tool that is
    // here reports itself as wired.
    const here = app.session.available().edges;
    expect(here.map((edge) => edge.affordanceId)).toContain('plan.choose-plan');
    expect(here.find((edge) => edge.affordanceId === 'plan.choose-plan')?.materialized).toBe(true);
    app.destroy();
  });

  it('is idempotent — re-showing the same page does not churn the registry', async () => {
    const app = createWizardApp();
    // Let the FIRST mount's coalesced structure row flush before measuring;
    // registration motion is real world motion and is supposed to bump.
    await settle();
    const before = app.session.version;
    app.mounts.showPage('welcome');
    app.mounts.showPage('welcome');
    await settle();
    expect(app.session.version).toBe(before);
    app.destroy();
  });

  it('mounts nothing when the router leaves the graph, and records the path off-graph', async () => {
    const app = createWizardApp();
    app.router.push('/settings/billing');
    await settle();

    expect(app.mounts.mountedPage()).toBeNull();
    // The RAW path went to sync — never a nearest-looking guess.
    expect(app.session.node).toBe('/settings/billing');
    expect(app.session.available().edges).toEqual([]);
    app.destroy();
  });

  it('starts wherever a deep link points', () => {
    const app = createWizardApp({ initialPath: '/review' });
    expect(app.session.node).toBe('review');
    expect(app.mounts.mountedPage()).toBe('review');
    app.destroy();
  });

  it('produces no dormancy warnings — mounts follow the router, so nothing is ever stranded', async () => {
    const app = createWizardApp();
    app.router.push('/profile');
    await settle();
    app.router.push('/plan');
    await settle();
    expect(app.warnings()).toEqual([]);
    app.destroy();
  });

  it('releases everything on destroy, and destroy is idempotent', () => {
    const app = createWizardApp();
    app.destroy();
    app.destroy();
    expect(app.mounts.mountedPage()).toBeNull();
  });
});
