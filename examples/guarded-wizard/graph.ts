/**
 * THE GRAPH — a guarded journey, grown from the app's own two descriptions.
 *
 * ONE reference implementation of the pattern, not the only shape it takes.
 * What it puts together, and why each piece is here rather than in the agent's
 * prompt:
 *
 * - the WIZARD's steps sit behind `when` guards, so a step whose precondition
 *   has not happened yet is not offered at all;
 * - `next-to-review` is served all along, `enabledWhen`-greyed until the
 *   recipe is really set — the greyed button an agent can SEE, instead of one
 *   it discovers by clicking;
 * - every step declares a `verify` contract, because a handler that RAN is not
 *   an action that HAPPENED;
 * - `crossLinks` turns the route table into the always-reachable spine, so no
 *   wizard page is a room with no doors;
 * - the journey's steps are ordinary PAGE actions — a journey narrows what is
 *   disclosed, it never owns an action, so the way out stays reachable while a
 *   frame is open.
 *
 * Nothing here is re-typed from somewhere else: ROUTES is the router's table
 * and JOURNEYS is the funnel list, both read as sources.
 */
import { buildNavigationGraph, fromJourneys, fromRoutes } from '../../src/index.js';
import type { JourneyDef } from '../../src/index.js';
import { PATHS } from './app.js';
import type { WizardApp } from './app.js';

/** The ROUTER's own table — one owner for every address. */
export const ROUTES = {
  projects: { route: PATHS.projects, does: 'the Projects list' },
  wizard: { route: PATHS.wizard, does: 'the New Project wizard' },
  review: { route: PATHS.review, does: 'the Review step' },
} as const;

/** The app's own funnel list — read as journeys in the same does/steps/when vocabulary. */
export const JOURNEYS: Record<string, JourneyDef> = {
  'new-project': {
    does: 'Create a project: name it, pick a recipe, review it, create it',
    steps: ['name-it', 'pick-recipe', 'next-to-review', 'create-project'],
  },
};

const NAME_INPUT = {
  type: 'object',
  properties: { name: { type: 'string' } },
  required: ['name'],
  additionalProperties: false,
} as const;

const RECIPE_INPUT = {
  type: 'object',
  properties: { recipe: { type: 'string' } },
  required: ['recipe'],
  additionalProperties: false,
} as const;

/**
 * Compile the graph. `crossLinks: false` builds the SAME wizard without the
 * spine — the control case the tests and the transcript use to show what the
 * spine is holding up (a Projects page nobody can reach is a dead end).
 */
export function buildWizardGraph(app: WizardApp, opts?: { crossLinks?: boolean }) {
  return buildNavigationGraph('wizard', {
    does: 'A three-page project wizard.',
    sources: [
      // The route table becomes pages AND — only because it was asked — the
      // link actions that make those pages reachable from each other.
      fromRoutes(ROUTES, { crossLinks: opts?.crossLinks === false ? undefined : true }),
      fromJourneys(JOURNEYS),
    ],
    // What a route table cannot know: which actions live where.
    pages: {
      wizard: {
        actions: {
          'name-it': {
            does: 'Name the project',
            input: NAME_INPUT,
            writes: ['project.name'],
            // The app's own answer to "did that actually happen?".
            verify: { 'project.name': { ne: '' } },
          },
          'pick-recipe': {
            does: 'Pick the analysis recipe',
            // GUARDED: no recipe before there is a project to give it to.
            when: { 'project.name': { ne: '' } },
            input: RECIPE_INPUT,
            writes: ['project.recipe'],
            verify: { 'project.recipe': { ne: '' } },
          },
          'next-to-review': {
            does: 'Go on to the review step',
            goTo: 'review',
            // The click-only control: no payload, and saying so is the only
            // thing that keeps a relay's `value: ""` off the handler.
            input: 'none',
            // GREYED, not hidden — the same expression that renders
            // <button disabled={!recipe}>.
            enabledWhen: { 'project.recipe': { ne: '' } },
            // The PREDICATE form: the library cannot see a router, the app can.
            verify: () => app.path === PATHS.review,
          },
        },
      },
      review: {
        actions: {
          'create-project': {
            does: 'Create the project',
            confirm: true,
            input: 'none',
            writes: ['projects.count'],
            verify: { 'projects.count': { gt: 0 } },
          },
        },
      },
    },
  });
}

export type WizardGraph = ReturnType<typeof buildWizardGraph>;
export type WizardSession = ReturnType<WizardGraph['createSession']>;
