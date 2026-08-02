import type { ActionGroupHandle, ActionHandler } from 'hcifootprint';

import type { OnboardingSession } from './graph.js';
import type { Router } from './router.js';
import { ROUTES, type WizardPageId } from './routes.js';
import type { SaveProfileInput, WizardStore } from './store.js';

/**
 * Which handlers exist RIGHT NOW — the honest answer to "can this act?".
 *
 * A wizard shows one step at a time, so one step's handlers are mounted at a
 * time. That is not a simplification for the demo; it is what every component
 * tree does, and it is what makes the library's materialisation question mean
 * something. Mount the whole app up front and every edge is always "wired",
 * which is a claim no screen supports.
 *
 * Note what has no entry below: every `goTo`-only tool. Navigation is performed
 * by the app's router through the session's `navigate` option, so there is no
 * handler to write, and therefore no fake handler to maintain.
 */
export interface MountController {
  /** Mount one page's handlers, releasing whatever was mounted before. Idempotent. */
  showPage(pageId: WizardPageId): void;
  /** Release everything (the router left the graph, or the app is going away). */
  clear(): void;
  /** Which page's handlers are mounted, or null. */
  mountedPage(): WizardPageId | null;
}

/**
 * The app's own functions, by page. `store.saveProfile` throws on an empty
 * name — a throwing handler settles its fire as 'refused' with the rollback,
 * which is the truth (the app did not do the thing), so nothing here catches.
 *
 * THE RULE THIS FILE LEARNED THE HARD WAY: a registered handler WINS over the
 * session's `navigate` fallback. `navigate` fills in for gestures nobody wired;
 * the moment you wire one, the whole gesture is yours. So `confirm-signup`,
 * which declares both `writes` and `goTo`, must do BOTH here — writing the
 * store and leaving the page unmoved would make the tool's navigation claim
 * true only on the cursor, and `toNodeClaimed` would sit there unconfirmed
 * saying so.
 */
export function pageHandlers(
  store: WizardStore,
  router: Router,
): Record<WizardPageId, Record<string, ActionHandler>> {
  return {
    welcome: {
      'verify-email': () => {
        store.verifyEmail();
      },
    },
    profile: {
      'save-profile': (payload) => {
        store.saveProfile((payload ?? {}) as SaveProfileInput);
      },
    },
    plan: {
      'choose-plan': (payload) => {
        store.choosePlan(String((payload as { plan?: unknown } | undefined)?.plan ?? ''));
      },
    },
    review: {
      'confirm-signup': () => {
        store.confirmSignup();
        // The other half of the declared effect. The address still comes from
        // the route table — the app owns the move, the table owns where to.
        router.push(ROUTES.done.route);
      },
    },
    // The terminal page has nothing to do. It still gets a group, so its
    // presence is registered like every other page rather than looking
    // un-mounted to the activation model.
    done: {},
  };
}

export function createMountController(
  session: OnboardingSession,
  store: WizardStore,
  router: Router,
): MountController {
  const handlers = pageHandlers(store, router);
  let mounted: { page: WizardPageId; handle: ActionGroupHandle } | null = null;

  function release(): void {
    if (!mounted) return;
    mounted.handle.unregister();
    mounted = null;
  }

  return {
    showPage(pageId) {
      if (mounted?.page === pageId) return; // already on screen — re-registering would only churn
      // Release first: two pages' groups must never be live at once, or the
      // session would report handlers for a step nobody can see.
      release();
      mounted = {
        page: pageId,
        handle: session.registerActions(pageId, { handlers: handlers[pageId] }),
      };
    },
    clear: release,
    mountedPage: () => mounted?.page ?? null,
  };
}
