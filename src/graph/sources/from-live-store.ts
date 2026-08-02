/**
 * fromLiveStore() — the app's live action store becomes per-node bindings,
 * attached per session. LAST in the documented merge order and BIND-ONLY by
 * construction: it is a disciplined caller of the existing declare-then-bind
 * wire (registerActions), so it can add and enable/disable bindings but can
 * never remove or reshape a page, an action declaration, or a journey laid down
 * earlier in the order.
 *
 * Reconciliation is BY IDENTITY, not by diffing objects: `${node}.${name}`
 * (+instance) is an action's identity across snapshots. A new identity
 * registers, a gone identity releases its handle, an `enabled` flip flows
 * through handle.setEnabled — and an UNCHANGED identity is never re-registered,
 * because the registry's last-wins warning would otherwise spam on every
 * store emission (stores hand out fresh arrays each read; object identity is
 * meaningless there). Consequence, stated: the handler bound at first sight
 * stays bound — to replace an action's behaviour, remove it and add it back.
 *
 * WHEN IT RE-READS — the invalidation contract, stated so an app can hold up its
 * end: your store must emit whenever the action surface changes, and NAVIGATION
 * is covered for you by a re-read on every page change the app REPORTS through
 * sync() (LiveBindingPort.whenPageChanges). A store whose actions are derived
 * from the router has no change of its own to announce when the page changes,
 * and without that re-read the surface after a navigation would be whatever the
 * last emission left behind. Nothing re-reads at whats_here/report time: a read
 * must never mutate the structure it is about to serve.
 *
 * Error stance, split by WHO is on the stack (the recorder rule, both ways):
 * the FIRST read at attach is LOUD — an invalid action is an authoring error
 * and dies at createSession, releasing anything half-attached — but a LATER read
 * runs on somebody else's stack (the app's notify loop, or the session mid-hop),
 * where a throw would abort their work. Those reconciles are isolated: a failure
 * warns and leaves bindings as-is until the next read. It is also DISCLOSED —
 * one gap row per failure streak — because bindings from before the failure are
 * still being served, and serving them silently would present a stale list as
 * current fact.
 *
 * LEAF MODULE with ZERO value imports: it drives the session INSTANCE it is
 * handed through the type-only LiveBindingPort, so importing fromLiveStore —
 * or bundling a static-graph consumer that never calls it — drags no session
 * machinery.
 */
import type { LiveAction, LiveActionStore, LiveBindingPort, LiveSource } from './types.js';
import type { ActionGroupHandle } from '../../traverse/nav-session.js';

/** One live registration this attachment currently owns. */
interface Held {
  handle: ActionGroupHandle;
  name: string;
  enabled: boolean;
  /** The label last pushed through setBusy — undefined means the store has said nothing. */
  busy: string | undefined;
}

/** The shape handed to registerActions — a LiveAction minus its addressing fields. */
type ActionDef = Omit<LiveAction, 'node' | 'name' | 'instance' | 'enabled' | 'busy'>;

/**
 * What the ledger says when a read failed — an AUTHORED constant, never the
 * store's own error text (that is the app's runtime string, and the row is read
 * by triage tooling and can reach a model). The dev warning carries the error;
 * this carries the consequence, which is the part a reader must not have to
 * infer: the bindings on offer are from BEFORE the failure.
 */
const READ_FAILED_REQUEST = 'live action store read failed; serving bindings from before the failure';

/**
 * Bind first, declare second. "Live actions attach last and only BIND" — so an
 * action the graph already DECLARES takes the handlers door, which
 * binds silently (the declared-wins warning would otherwise spam every attach
 * for the merge order's PRIMARY case). Only when the session refuses
 * the bind ("binds unknown action") is the action genuinely NEW here, and it
 * takes the mount-declaration door — the same two doors a hand-written mount
 * chooses between, chosen the only way a zero-value-import leaf can: by
 * asking the session and listening to the answer.
 */
function register(
  session: LiveBindingPort,
  node: string,
  name: string,
  def: ActionDef,
  instance: string | undefined,
): ActionGroupHandle {
  const instanceOpt = instance !== undefined ? { instance } : {};
  if (def.handler) {
    try {
      return session.registerActions(node, { handlers: { [name]: def.handler }, ...instanceOpt });
    } catch {
      // Not declared on the graph — fall through to declaring it here-and-now.
      // (The refusal happens BEFORE any registration side effect, so nothing
      // is half-mounted.) A bad name/shape still dies loudly below.
    }
  }
  return session.registerActions(node, { actions: { [name]: def }, ...instanceOpt });
}

/** An action's identity across snapshots — same key, same action. */
function identityOf(action: LiveAction): string {
  return action.instance === undefined
    ? `${action.node}.${action.name}`
    : `${action.node}.${action.name}[${action.instance}]`;
}

/**
 * Read a live action store into a LiveSource. Declare it in `sources` so every
 * createSession() wires it (and detachSources() releases it) — or use the
 * direct door: `const detach = fromLiveStore(store).attach(session)`.
 */
export function fromLiveStore(store: LiveActionStore): LiveSource {
  return Object.freeze({
    kind: 'live' as const,

    attach(session: LiveBindingPort, warn?: (message: string) => void): () => void {
      // Each attach() owns its OWN ledger, so attach → detach → attach is a
      // clean rebuild and two sessions can share one store without crosstalk.
      const held = new Map<string, Held>();
      let detached = false;
      // createSession hands the session's own warn sink; the direct door
      // (attach called by hand) falls back to the console, same default as
      // every other warn seam in the library.
      const report = warn ?? ((message: string) => console.warn(message));

      const reconcile = (): void => {
        if (detached) return; // a late store emission after detach must not resurrect bindings
        const desired = new Map<string, LiveAction>();
        for (const action of store.actions()) desired.set(identityOf(action), action);

        // Gone → release. Iterate a copy: unregister mutates nothing here, but
        // the ledger does, and deleting while iterating is a classic self-bite.
        for (const [key, entry] of [...held]) {
          if (!desired.has(key)) {
            entry.handle.unregister();
            held.delete(key);
          }
        }

        for (const [key, action] of desired) {
          const existing = held.get(key);
          const enabled = action.enabled ?? true;
          // No default, deliberately: an absent label is the store saying
          // nothing about this control, and `undefined` is exactly how that
          // travels the rest of the way (never a manufactured "not busy").
          const busy = action.busy;
          if (existing) {
            // UNCHANGED identity: never re-registered (see module header).
            // The tracked mutable bits are `enabled` and `busy` — a real flip
            // of either rides its setter, which the session already treats as
            // world motion. No new subscription: the store emission that
            // brought a spinner up is the one that brings the label with it.
            if (enabled !== existing.enabled) {
              existing.handle.setEnabled(existing.name, enabled);
              existing.enabled = enabled;
            }
            if (busy !== existing.busy) {
              existing.handle.setBusy(existing.name, busy);
              existing.busy = busy;
            }
            continue;
          }
          const { node, name, instance, enabled: _enabled, busy: _busy, ...def } = action;
          const handle = register(session, node, name, def, instance);
          // Initial disabled state goes through the handle AFTER registration:
          // the mount-declared path registers handlers enabled, and the handle
          // is the one instance-aware door for flipping that — same door the
          // later flips use, so first-sight and later states take one path.
          if (!enabled) handle.setEnabled(name, false);
          // Same reasoning for a control that is ALREADY working when the store
          // first publishes it (a reload mid-save): one door, one path.
          if (busy !== undefined) handle.setBusy(name, busy);
          held.set(key, { handle, name, enabled, busy });
        }
      };

      // Whether a read is CURRENTLY failing — armed on the first failure of a
      // streak, cleared by the next read that works. The gap row is the loud,
      // agent-visible half of the warning, and one row per streak is the honest
      // grain: a store that throws on every emission has one broken read, not
      // forty unmet demands.
      let readFailing = false;

      /**
       * The reconcile every LATER read takes: warn-not-throw, and never silent.
       *
       * ISOLATED for two different reasons on the two paths that call it. The
       * store's own notify loop is the app's stack, and a throw there would
       * abort the app's iteration over its other subscribers. The page-change
       * path is the SESSION's stack, mid-hop, and a throw there would abort a
       * navigation that already happened. Neither caller asked to be broken by
       * a store read, and reconcile is idempotent by identity, so the next read
       * simply retries.
       *
       * The failure is DISCLOSED, not just logged: the bindings on offer are now
       * from before the failure, and serving them with nothing said would be the
       * session presenting a stale list as current fact. The row is marked
       * `actionsMayBeStale`, which is what carries it past the app's triage
       * ledger and into the facts block a model reads — the whole point of
       * saying it out loud.
       */
      const reconcileIsolated = (): void => {
        try {
          reconcile();
          readFailing = false; // a read that works ends the streak
        } catch (error) {
          report(
            `hcifootprint: a live store change could not be reconciled (bindings unchanged until the ` +
              `next store emission or page change): ${String(error)}`,
          );
          if (readFailing) return;
          readFailing = true;
          session.reportGap?.({
            request: READ_FAILED_REQUEST,
            // The published GapReason union did NOT grow for this: a broken read
            // is not a new SHAPE of unmet demand, and 'other' plus a request
            // that names the truth says more than a new word would.
            reason: 'other',
            principal: 'system',
            actionsMayBeStale: true,
          });
        }
      };

      // Subscribe BEFORE the first read: a store that emits synchronously
      // during subscribe just runs an extra reconcile, which is idempotent.
      const unsubscribe = store.subscribe(reconcileIsolated);
      // …and re-read whenever the app REPORTS a page change. A store whose
      // actions are derived from the router has no change of its own to announce
      // when the page changes, so without this the surface after a navigation is
      // whatever the last emission left behind. Free when nothing moved: the
      // identity ledger re-registers nothing, so a no-change re-read is a diff
      // and no world motion. A port that does not offer the hook keeps exactly
      // the old behaviour (store emissions only).
      const unwatch = session.whenPageChanges?.(reconcileIsolated);
      try {
        // The first read stays LOUD — an invalid action is an authoring error
        // and should die at createSession, not degrade into a warning…
        reconcile();
      } catch (error) {
        // …but a loud death must not leak: drop BOTH subscriptions and release
        // anything registered before the bad action, so the failed attach
        // leaves neither a live listener nor half-mounted bindings behind.
        unsubscribe();
        unwatch?.();
        for (const { handle } of held.values()) handle.unregister();
        held.clear();
        throw error;
      }

      return () => {
        // Idempotent detach: the second call finds nothing to release. Both
        // subscriptions go — a source still re-reading after detach is the same
        // resurrection the `detached` guard refuses, one layer up.
        if (detached) return;
        detached = true;
        unsubscribe();
        unwatch?.();
        for (const { handle } of held.values()) handle.unregister();
        held.clear();
      };
    },
  });
}
