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
 *    contribute link tools; hand-authored tools win."
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
    sources: [fromRoutes(ROUTES), fromJourneys(JOURNEYS)],
    pages: HAND_PAGES,
  });
}

/** The compiled graph type, derived — never re-typed by hand. */
export type OnboardingGraph = ReturnType<typeof buildOnboardingGraph>;

/** The live session type, derived from the graph that creates it. */
export type OnboardingSession = ReturnType<OnboardingGraph['createSession']>;

/** Node paths this graph accepts — the union the compiler inferred from the literals. */
export type OnboardingNodePath = Parameters<OnboardingSession['registerToolGroup']>[0];
