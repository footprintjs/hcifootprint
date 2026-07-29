/**
 * fromLiveStore() — the app's live action store becomes per-node bindings,
 * attached per session. LAST in the documented merge order and BIND-ONLY by
 * construction: it is a disciplined caller of the existing declare-then-bind
 * wire (registerToolGroup), so it can add and enable/disable bindings but can
 * never remove or reshape a page, a tool declaration, or a skill laid down
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
 * Error stance, split by WHO is on the stack (the recorder rule, both ways):
 * the FIRST read at attach is LOUD — an invalid action is an authoring error
 * and dies at createSession, releasing anything half-attached — but a LATER
 * store emission runs inside the app's own notify loop, where a throw would
 * abort the app's iteration over its other subscribers. Those reconciles are
 * isolated: a failure warns and leaves bindings as-is until the next emission.
 *
 * LEAF MODULE with ZERO value imports: it drives the session INSTANCE it is
 * handed through the type-only LiveBindingPort, so importing fromLiveStore —
 * or bundling a static-graph consumer that never calls it — drags no session
 * machinery.
 */
import type { LiveAction, LiveActionStore, LiveBindingPort, LiveSource } from './types.js';
import type { ToolGroupHandle } from '../../traverse/nav-session.js';

/** One live registration this attachment currently owns. */
interface Held {
  handle: ToolGroupHandle;
  name: string;
  enabled: boolean;
}

/** The shape handed to registerToolGroup — a LiveAction minus its addressing fields. */
type ActionDef = Omit<LiveAction, 'node' | 'name' | 'instance' | 'enabled'>;

/**
 * Bind first, declare second. "Live actions attach last and only BIND" — so an
 * action whose tool the graph already DECLARES takes the handlers door, which
 * binds silently (the declared-wins warning would otherwise spam every attach
 * for the merge order's PRIMARY case). Only when the session refuses
 * the bind ("binds unknown tool") is the action genuinely NEW here, and it
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
): ToolGroupHandle {
  const instanceOpt = instance !== undefined ? { instance } : {};
  if (def.handler) {
    try {
      return session.registerToolGroup(node, { handlers: { [name]: def.handler }, ...instanceOpt });
    } catch {
      // Not declared on the graph — fall through to declaring it here-and-now.
      // (The refusal happens BEFORE any registration side effect, so nothing
      // is half-mounted.) A bad name/shape still dies loudly below.
    }
  }
  return session.registerToolGroup(node, { tools: { [name]: def }, ...instanceOpt });
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
          if (existing) {
            // UNCHANGED identity: never re-registered (see module header).
            // The one tracked mutable bit is `enabled` — a real flip rides
            // setEnabled, which the session already treats as world motion.
            if (enabled !== existing.enabled) {
              existing.handle.setEnabled(existing.name, enabled);
              existing.enabled = enabled;
            }
            continue;
          }
          const { node, name, instance, enabled: _enabled, ...def } = action;
          const handle = register(session, node, name, def, instance);
          // Initial disabled state goes through the handle AFTER registration:
          // the mount-declared path registers handlers enabled, and the handle
          // is the one instance-aware door for flipping that — same door the
          // later flips use, so first-sight and later states take one path.
          if (!enabled) handle.setEnabled(name, false);
          held.set(key, { handle, name, enabled });
        }
      };

      // Subscribe BEFORE the first read: a store that emits synchronously
      // during subscribe just runs an extra reconcile, which is idempotent.
      // The subscribed path is ISOLATED (module header, error stance): it runs
      // inside the app's own notify loop, and a throw there would abort the
      // app's iteration over its other subscribers — consumer store code must
      // never be broken by ours. reconcile is idempotent by identity, so the
      // next emission simply retries.
      const unsubscribe = store.subscribe(() => {
        try {
          reconcile();
        } catch (error) {
          report(
            `hcifootprint: a live store change could not be reconciled (bindings unchanged until the ` +
              `store's next emission): ${String(error)}`,
          );
        }
      });
      try {
        // The first read stays LOUD — an invalid action is an authoring error
        // and should die at createSession, not degrade into a warning…
        reconcile();
      } catch (error) {
        // …but a loud death must not leak: drop the subscription and release
        // anything registered before the bad action, so the failed attach
        // leaves neither a live listener nor half-mounted bindings behind.
        unsubscribe();
        for (const { handle } of held.values()) handle.unregister();
        held.clear();
        throw error;
      }

      return () => {
        // Idempotent detach: the second call finds nothing to release.
        if (detached) return;
        detached = true;
        unsubscribe();
        for (const { handle } of held.values()) handle.unregister();
        held.clear();
      };
    },
  });
}
