import { buildNavigationGraph, fromJourneys, fromRoutes } from 'hcifootprint';

import { JOURNEYS } from './journeys.js';
import { HAND_PAGES } from './pages.js';
import { ROUTES } from './routes.js';

/**
 * THE GRAPH — grown from what the app already had.
 *
 * Three lines of input, one documented order:
 *
 *   "Pages first (routes then hand-authored, hand-authored wins), journeys
 *    overlay second and may only add, live actions attach last and only bind —
 *    nothing later in the order may remove anything earlier. Routes may also
 *    contribute link actions; hand-authored actions win."
 *
 * This demo uses the two STATIC sources. They fold into one plain definition
 * before the compiler walks it, so every refusal a hand-written def would get
 * (unknown goTo page, ambiguous step name, guard-operator typo) still lands in
 * the compiler's own voice — sources add input, never a second rulebook.
 *
 * A fresh graph per call: a compiled graph is frozen, but the demo builds
 * several (the live app, the panels' comparison builds, each test) and sharing
 * one instance across them would make a test's session visible to a panel.
 */
export function buildOnboardingGraph() {
  return buildNavigationGraph('onboarding', {
    does: 'A five-step signup wizard.',
    // `crossLinks: true` because the route table already knows every page's
    // address, and without it `done` is a genuine DEAD END: it exists only
    // because the route table declared it (see pages.ts), so it has no
    // hand-authored actions, and an agent that lands there has nothing it can
    // even attempt. The session says so out loud — a dead-end gap row and a dev
    // warning naming the three ways out. This is the third of them, and the
    // right one here: hand-authoring a block on `done` purely to escape it
    // would undo the very thing this demo exists to show.
    sources: [fromRoutes(ROUTES, { crossLinks: true }), fromJourneys(JOURNEYS)],
    pages: HAND_PAGES,
  });
}

/** The compiled graph type, derived — never re-typed by hand. */
export type OnboardingGraph = ReturnType<typeof buildOnboardingGraph>;

/** The live session type, derived from the graph that creates it. */
export type OnboardingSession = ReturnType<OnboardingGraph['createSession']>;

/** Node paths this graph accepts — the union the compiler inferred from the literals. */
export type OnboardingNodePath = Parameters<OnboardingSession['registerActions']>[0];
