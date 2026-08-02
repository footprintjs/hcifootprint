import { describe, expect, it } from 'vitest';

import { buildOnboardingGraph } from '../src/app/graph.js';
import { JOURNEYS } from '../src/app/journeys.js';
import { HAND_PAGES } from '../src/app/pages.js';
import { ROUTES } from '../src/app/routes.js';

/**
 * The graph this app runs on is grown from two sources plus hand-authored
 * blocks. These are the merge order's promises, asserted against the compiled
 * result rather than against the definition — the definition is the input, the
 * spec is the claim.
 */
describe('the onboarding graph, grown from sources', () => {
  const graph = buildOnboardingGraph();

  it('turns every route in the app’s own table into a page', () => {
    for (const [pageId, entry] of Object.entries(ROUTES)) {
      expect(graph.spec.pages[pageId], `page '${pageId}'`).toBeDefined();
      expect(graph.spec.pages[pageId]?.route).toBe(entry.route);
    }
    expect(Object.keys(graph.spec.pages).sort()).toEqual(
      ['done', 'plan', 'profile', 'review', 'welcome'],
    );
  });

  it('carries a page NO hand-authored block declares — `done` exists only because the route table said so', () => {
    expect(Object.keys(HAND_PAGES)).not.toContain('done');
    expect(graph.spec.pages.done).toBeDefined();
    expect(graph.spec.pages.done?.route).toBe('/done');
  });

  it('backfills the address of a hand-authored page that declared none (the merge order’s one courtesy)', () => {
    // The literal really does omit it — otherwise this test proves nothing.
    expect(HAND_PAGES.profile).not.toHaveProperty('route');
    expect(HAND_PAGES.welcome).not.toHaveProperty('route');
    expect(graph.spec.pages.profile?.route).toBe('/profile');
    expect(graph.spec.pages.welcome?.route).toBe('/');
  });

  it('lets the hand-authored block win: `review` keeps its own tools AND its own agreeing route', () => {
    expect(HAND_PAGES.review.route).toBe('/review');
    expect(graph.spec.pages.review?.route).toBe('/review');
    // The bare source page did not replace the hand-authored one.
    expect(graph.spec.affordances['review.confirm-signup']).toBeDefined();
  });

  it('lets a hand-authored page keep its tools even when the route was backfilled', () => {
    expect(graph.spec.affordances['welcome.to-profile']).toBeDefined();
    expect(graph.spec.affordances['profile.save-profile']).toBeDefined();
  });

  it('overlays both journeys as skills, resolving suffix step names to qualified ids', () => {
    expect(Object.keys(graph.spec.journeys).sort()).toEqual(['import-signup', 'signup']);
    expect(graph.spec.journeys.signup?.steps).toEqual([
      'profile.save-profile',
      'plan.choose-plan',
      'review.confirm-signup',
    ]);
    expect(graph.spec.journeys['import-signup']?.steps).toEqual([
      'welcome.import-from-google',
      'plan.choose-plan',
      'review.confirm-signup',
    ]);
    // The precondition rode across from the journey definition untouched.
    expect(graph.spec.journeys.signup?.precondition).toEqual(JOURNEYS.signup?.when);
  });

  it('reports every guard key the graph reads, including the one the app cannot seed', () => {
    expect(graph.requiredStateKeys()).toEqual([
      'emailVerified',
      'googleLinked',
      'plan',
      'profileComplete',
      'signedUp',
    ]);
  });

  it('gives every navigation tool a goTo and NO binding — so the url gesture is derived from the target’s route', () => {
    for (const id of ['welcome.to-profile', 'profile.to-plan', 'plan.to-review', 'review.back-to-plan']) {
      const affordance = graph.spec.affordances[id];
      expect(affordance?.effect?.navigatesTo, id).toBeDefined();
      expect(affordance?.binding, id).toBeUndefined();
    }
  });

  it('keeps the unwired journey’s entry step declared as a CLICK — a gesture no address can stand in for', () => {
    expect(graph.spec.affordances['welcome.import-from-google']?.binding).toEqual({
      kind: 'element',
      locator: { role: 'button', name: 'Import from Google' },
      actuation: 'click',
    });
  });

  it('builds a fresh graph each call — panels and tests must never share one instance', () => {
    expect(buildOnboardingGraph()).not.toBe(graph);
  });
});
