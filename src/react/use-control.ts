/**
 * ONE HOOK, AND IT ONLY EVER HANDS AN ELEMENT OVER.
 *
 * `useControl` is the DECLARED evidence level with React's lifecycle wrapped
 * round it: the component says "this element IS this edge", React says when the
 * element exists and when it stops existing, and the core does everything else.
 * Nothing here recognises anything, decides a cadence, judges a payload or
 * suppresses a duplicate — those are the core's, and a skin that re-decided any
 * of them would be a second brain to keep in step.
 *
 * THE ONE CANONICAL DOOR, AND THIS HOOK IS ON THE RECORD-ONLY SIDE OF IT. It
 * never calls `fire()` and never runs a handler: your own `onClick` performs the
 * act, exactly as it did before, and the sensor records that it happened
 * (`invoke: false`, pinned by the core's port). So adopting this hook deletes
 * REPORTING code and leaves BEHAVIOUR untouched — and there is no arrangement of
 * it that can run one human click twice.
 *
 * WHAT IT DELIBERATELY DOES NOT DO: register the handler. `registerToolGroup` is
 * already the library's one mount door and it is framework-free — call it from
 * your own effect. It is not folded in here because a declaration needs the EDGE
 * ID, and that id is the engine's to resolve: `#resolveToolOnNode`
 * (nav-session.ts:414-417) prefers `node.leaf` but falls back to a bare root
 * tool, and neither `registerTool` nor `registerToolGroup` hands the resolved id
 * back (atom/types.ts:512-519 — `ToolHandle` carries `node` and `toolId`, never
 * the id). A binding that re-joined `` `${node}.${id}` `` would copy the engine's
 * own qualification into every skin and be silently wrong for a root tool, which
 * is exactly the duplication a skin must refuse.
 */
import { useCallback, useInsertionEffect, useRef } from 'react';
import type { ControlAttachment } from '../sensor/types.js';
import type { ControlDeclaration } from '../sensor/control-index.js';
import type { SensorElement } from '../sensor/dom-port.js';
import { useControlSurface } from './context.js';

/**
 * What a component declares about one control: the core's own
 * {@link ControlDeclaration} minus the element, because the ref supplies that.
 *
 * DERIVED, NEVER RESTATED. A field the core grows arrives here for free, and the
 * two can never drift into describing different things.
 */
export type ControlSpec = Omit<ControlDeclaration, 'element'>;

/**
 * The ref callback the hook returns. It takes the structural
 * {@link SensorElement}, which every real `HTMLElement` satisfies — so it goes
 * straight onto a `<button>`, an `<input>` or a `<div>` with no cast.
 */
export type ControlRef = (element: SensorElement | null) => void;

/**
 * Declare this element as the control for one edge, for as long as it is rendered.
 *
 * ```ts
 * const ref = useControl({ edge: 'compose.send', value: () => draft });
 * return createElement('button', { ref, onClick: send }, 'Send');
 * ```
 */
export function useControl(spec: ControlSpec): ControlRef {
  const watch = useControlSurface();
  const held = useRef<ControlAttachment | null>(null);

  /**
   * The newest COMMITTED render's spec, so a declared getter is read from the
   * render the human is LOOKING AT.
   *
   * NOT WRITTEN DURING RENDER, and that is the whole reason this is an effect at
   * all. React may begin a render, yield, and throw it away: while a
   * `startTransition` re-render is in flight the screen and the committed tree
   * still hold the OLD value, so a ref written from the render body holds a value
   * nobody has seen — for as long as that render takes. A click landing in that
   * window would report it, and the sensor's payload would disagree with the
   * app's own handler about what the human just did. A payload that plausibly
   * disagrees is indistinguishable, on the ledger, from a correct one.
   *
   * AND `useInsertionEffect` RATHER THAN `useLayoutEffect`, FOR THE ORDERING. An
   * insertion effect runs in the MUTATION phase, before React attaches any ref,
   * so the callback below already sees this commit's spec when it spreads it. A
   * layout effect runs after the ref it feeds, so the attachment would carry the
   * PREVIOUS render's edge — "a new edge re-declares" in
   * test/react-use-control.test.ts is the assertion that says so out loud.
   * `useEffect` is later still and cannot work at all: the sensor listens in the
   * capture phase on a root ABOVE React's own container listener, so it runs
   * before a pending passive effect could flush.
   *
   * It is also the only one of the three that says nothing on a server — React 18
   * warns about `useLayoutEffect` during `renderToString`, and a component using
   * this hook is meant to render there in silence.
   */
  const latest = useRef(spec);
  useInsertionEffect(() => {
    latest.current = spec;
  });

  /**
   * Whether each GETTER was declared is part of the control's IDENTITY, not part
   * of what it answers. The core reads `declaration.value === undefined` to decide
   * whether an edge is honestly `blocked: 'payload'` (binding-index.ts:202), so a
   * control that gains or loses its getter is a different declaration and has to
   * be re-attached — while a getter that merely closes over new state is not.
   * `commits` follows the same rule rather than a second one, so a reader learns
   * "a declared getter is handed over only when the app declared it" once.
   */
  const declaresValue = spec.value !== undefined;
  const declaresCommits = spec.commits !== undefined;

  /**
   * A `{ debounceMs }` cadence is written inline at the call site, so its OBJECT
   * identity changes on every render while the policy it states does not. The
   * dependency is the policy — the window in milliseconds, or the literal name.
   */
  const cadenceKey = typeof spec.cadence === 'object' ? spec.cadence.debounceMs : spec.cadence;

  return useCallback(
    (element: SensorElement | null): void => {
      // React hands a ref callback `null` before it swaps in a new one AND before
      // the component unmounts, so both teardowns arrive here and neither needs an
      // effect beside it — which would only be a second release for one event.
      // (React 19 can take a cleanup RETURNED from a ref instead; this form is
      // used because the peer floor is React 18, where a returned value is warned
      // about rather than honoured.)
      held.current?.detach();
      held.current = null;
      if (element === null || watch === null) return;
      held.current = watch.attach({
        // Spread rather than copied field by field, so a field the core adds later
        // travels without this file being edited — but only as far as the FIRST
        // attach. The dependencies below ARE this control's identity, and nothing
        // derives them from the spec: a new identity field has to be added to them
        // too, or a change to it will never re-declare the control and the core
        // will keep serving the value this attachment was born with.
        ...latest.current,
        element,
        // The declared getters are reached THROUGH the ref, so the attachment
        // outlives every re-render while still reading the newest committed
        // closure. Each is handed over only when the app declared one — an
        // always-present wrapper would tell the core a value exists for a control
        // whose app never said so, and would make every control look like one that
        // knows when it commits.
        ...(declaresValue ? { value: (): unknown => latest.current.value?.() } : {}),
        ...(declaresCommits ? { commits: (): boolean => latest.current.commits?.() ?? true } : {}),
      });
    },
    [watch, spec.edge, spec.instance, cadenceKey, declaresValue, declaresCommits],
  );
}
