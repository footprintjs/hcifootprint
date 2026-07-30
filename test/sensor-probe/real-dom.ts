/**
 * MUST COMPILE, under `lib: ["ES2022", "DOM"]`.
 *
 * Every assignment below is a claim the sensor's port makes about the real DOM, and
 * a compiler is the only thing that can check it. A runtime fake proves the sensor's
 * logic; only this proves that a browser's own objects satisfy the interfaces the
 * sensor asks for — which is the whole reason the port may be structural and the
 * library may compile with no DOM lib at all.
 */
import type {
  SensorDocument,
  SensorElement,
  SensorEvent,
  SensorRoot,
  SensorTimers,
  SensorWindow,
} from '../../src/sensor/index.js';

/** An element the app hands over, and the one every walk climbs. */
export function elementSatisfiesThePort(node: HTMLElement): SensorElement {
  return node;
}

/** The <input type=submit> whose `value` is a LABEL — the one member that reads it. */
export function inputSatisfiesThePort(node: HTMLInputElement): SensorElement {
  return node;
}

/** A <select> reaches the same port; nothing about it is special to the sensor. */
export function selectSatisfiesThePort(node: HTMLSelectElement): SensorElement {
  return node;
}

/** All three real delegation roots. */
export function elementRootSatisfiesThePort(node: HTMLElement): SensorRoot {
  return node;
}

export function documentRootSatisfiesThePort(node: Document): SensorRoot {
  return node;
}

export function shadowRootSatisfiesThePort(node: ShadowRoot): SensorRoot {
  return node;
}

/** The document, for aria-labelledby resolution and for reaching the view. */
export function documentSatisfiesThePort(node: Document): SensorDocument {
  return node;
}

/** The view: location motion, and the clock a debounced cadence borrows. */
export function windowSatisfiesThePort(view: Window): SensorWindow {
  return view;
}

/** The event, whose `isTrusted` is the whole mis-attribution guard. */
export function eventSatisfiesThePort(event: MouseEvent): SensorEvent {
  return event as unknown as SensorEvent;
}

/** A keyboard event carries the `key` the press gesture is read from. */
export function keyEventSatisfiesThePort(event: KeyboardEvent): SensorEvent {
  return event as unknown as SensorEvent;
}

/** The timer pair, taken off a real window and bound the way `timersOf` binds it. */
export function windowTimersSatisfyThePort(view: Window): SensorTimers {
  return {
    setTimeout: (handler, timeout) => view.setTimeout(handler, timeout),
    clearTimeout: (handle) => view.clearTimeout(handle as number),
  };
}

/** A real listener registration accepts the sensor's own listener and capture flag. */
export function registrationTypechecks(node: HTMLElement, listener: (event: SensorEvent) => void): void {
  const asRoot: SensorRoot = node;
  asRoot.addEventListener('click', listener, { capture: true });
  asRoot.removeEventListener('click', listener, { capture: true });
}
