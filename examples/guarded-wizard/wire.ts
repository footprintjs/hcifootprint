/**
 * THE WIRING — the additive lines that make the app agent-drivable.
 *
 * - `navigate` — the session performs url gestures through the app's OWN
 *   router, so a pure navigation needs no handler at all;
 * - `registerActions` — the app's existing functions, by reference;
 * - two taps — the store reports the lean projection, the router reports the
 *   page;
 * - nothing else. The app above this file is untouched.
 *
 * The tap reports on EVERY notify, including the ones where the handler
 * changed nothing. That is deliberate and it is what makes the example honest:
 * a report can land, the declared write key can be present in it, and the
 * action can still not have happened — which is exactly the pair of truths
 * `effectVerified` and `verifyHeld` keep apart.
 */
import { matchRoute } from '../../src/index.js';
import { createWizardApp } from './app.js';
import type { WizardApp } from './app.js';
import { buildWizardGraph } from './graph.js';
import type { WizardGraph, WizardSession } from './graph.js';

export interface WiredWizard {
  app: WizardApp;
  graph: WizardGraph;
  session: WizardSession;
  /** Everything the session warned about, in order — the dev channel, captured. */
  warnings: string[];
  /** Release the store tap (the unmount half). */
  detach(): void;
}

/**
 * Build the app, compile the graph, open one session and connect the two.
 * `crossLinks: false` wires the identical app to the spine-less graph — the
 * control the tests and the transcript compare against.
 */
export function wireWizard(opts?: { crossLinks?: boolean }): WiredWizard {
  const app = createWizardApp();
  const graph = buildWizardGraph(app, opts);
  const warnings: string[] = [];
  const session = graph.createSession({
    node: 'wizard',
    state: app.projection(),
    // (1) the app's own router — no fake do-nothing handlers for navigations.
    navigate: (href) => app.navigate(href),
    onWarn: (message) => warnings.push(message),
  });

  // (2) the app's existing functions, by reference. `next-to-review` is
  // deliberately absent: it is a pure navigation and materialises through (1).
  session.registerActions('wizard', {
    handlers: {
      'name-it': (input) => app.nameProject(input),
      'pick-recipe': (input) => app.pickRecipe(input),
    },
  });
  session.registerActions('review', {
    handlers: { 'create-project': () => app.createProject() },
  });

  // (3) the two taps, one per kind of motion. The store reports STATE; the
  // router reports POSITION, and a path the matcher cannot place is handed
  // over RAW — recorded off-graph rather than resolved to the nearest-looking
  // page. Kept apart because a navigation is not a state delta: reporting one
  // as if it were hands the session an unattributed delta, and an unattributed
  // delta is something it then has to GUESS an author for.
  const detachStore = app.onChange(() => void session.updateState(app.projection()));
  const detachRouter = app.onNavigate(() =>
    session.sync(matchRoute(graph.spec.pages, app.path) ?? app.path),
  );

  return {
    app,
    graph,
    session,
    warnings,
    detach: () => {
      detachStore();
      detachRouter();
    },
  };
}
