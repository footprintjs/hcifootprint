/**
 * THE APP — a domain desk with two views, and a store that publishes on CHANGE.
 *
 * Nothing here is contrived to make a point. Publish-on-change is what a store
 * does; the netting is the app's own and it is correct. It is the shape the
 * archived run was recorded against.
 */
import { buildNavigationGraph } from '../../src/index.js';
import type { InteractionSession } from '../../src/index.js';

/**
 * `open-billing` declares BOTH halves, and the second is the one that matters:
 *
 * - `writes` names the key it changes — key NAMES only, by stated law, so this
 *   alone can never tell the library what value the action would set;
 * - `verify` is the app's own postcondition, and it carries the VALUE. That is
 *   the declaration the already-true rule reads.
 *
 * `open-claims` is its twin with no `verify` at all — the honest limit, printed
 * beside the cure so a reader can see exactly what the one line buys.
 */
export function deskGraph(): ReturnType<typeof buildNavigationGraph> {
  return buildNavigationGraph('desk', {
    pages: {
      workspace: {
        actions: {
          'open-billing': {
            does: 'Open the billing domain view',
            writes: ['view.domain'],
            verify: { 'view.domain': { eq: 'billing' } },
          },
          'open-claims': {
            does: 'Open the claims domain view',
            writes: ['view.domain'],
          },
        },
      },
    },
  });
}

/** The session, wired to a store that only publishes when a value really moves. */
export function wireDesk(startingDomain: string): InteractionSession {
  const session = deskGraph().createSession({
    node: 'workspace',
    state: { 'view.domain': startingDomain },
    onWarn: () => undefined,
  });
  const store: Record<string, unknown> = { 'view.domain': startingDomain };
  const setDomain = (next: string): void => {
    if (store['view.domain'] === next) return; // ← nobody is notified, and that is CORRECT
    store['view.domain'] = next;
    session.updateState({ 'view.domain': next });
  };
  session.registerHandlers({
    group: 'workspace',
    handlers: {
      'workspace.open-billing': () => setDomain('billing'),
      'workspace.open-claims': () => setDomain('claims'),
    },
  });
  return session;
}
