/**
 * An element's accessible name — the second half of the locator vocabulary
 * (atom/types.ts:71-75).
 *
 * A DOCUMENTED SUBSET of the accname specification, in the spec's own order:
 *   aria-labelledby → aria-label → native label → an input button's value →
 *   visible text → title
 *
 * WHAT UNSUPPORTED CONSTRUCTS DO — the whole reason this file is small and this
 * comment is long: they yield `''`. Not a fallback, not a nearest guess. An
 * empty name matches no declared locator, the click is reported as off-graph,
 * and the ledger gains nothing. That is the honesty law in its cheapest form:
 * the sensor would rather tell you it did not recognize a control than sign a
 * human's name to a row it inferred. Growing the subset later only ever turns
 * silence into recognition — it can never turn a wrong row into a right one,
 * because a wrong row was never written.
 *
 * Known to be OUTSIDE the subset today, and therefore honestly unnamed:
 * `alt` on a nested <img>, CSS ::before/::after content, <fieldset><legend>,
 * `placeholder`, and aria-labelledby chains that themselves need resolving.
 */
import type { SensorDocument, SensorElement } from './dom-port.js';
import { normalizeName } from './binding-index.js';

/** Visible text, whitespace-collapsed — the same reading both sides of a match get. */
function textOf(element: SensorElement): string {
  return normalizeName(element.textContent ?? '');
}

/** An <input type=submit|button|reset> carries its label in `value`, never in child text. */
function isInputButton(element: SensorElement): boolean {
  if (element.tagName.toLowerCase() !== 'input') return false;
  const type = (element.getAttribute('type') ?? 'text').trim().toLowerCase();
  return type === 'submit' || type === 'button' || type === 'reset';
}

/**
 * Which elements take their name from a <label>.
 *
 * NOT the same set as HTML's "labelable" — that one includes <button>, and a
 * button's accessible name comes from its own content. This is the accname
 * reading: a FIELD is named by its label, a button speaks for itself.
 */
function takesNameFromLabel(element: SensorElement): boolean {
  const tag = element.tagName.toLowerCase();
  return tag === 'input' || tag === 'select' || tag === 'textarea';
}

/** The nearest ancestor <label>, for the wrapping form `<label>Name <input/></label>`. */
function wrappingLabel(element: SensorElement): SensorElement | undefined {
  let node: SensorElement | null = element.parentElement;
  // Bounded: a malformed or cyclic parent chain must not hang the page the
  // sensor is only supposed to be listening to.
  for (let hops = 0; node !== null && hops < 32; hops += 1, node = node.parentElement) {
    if (node.tagName.toLowerCase() === 'label') return node;
  }
  return undefined;
}

/**
 * The name this element presents, or `''` when the subset above cannot say.
 *
 * `document` is optional because a detached element has none, and the one rung
 * that needs it (aria-labelledby) then simply does not apply — an absent
 * document degrades that rung to silence, never to a guess.
 */
export function computeAccessibleName(element: SensorElement, document?: SensorDocument): string {
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy !== null && document !== undefined) {
    const parts: string[] = [];
    for (const id of labelledBy.trim().split(/\s+/)) {
      if (id === '') continue;
      const referenced = document.getElementById(id);
      if (referenced !== null) parts.push(textOf(referenced));
    }
    const joined = normalizeName(parts.join(' '));
    if (joined !== '') return joined;
  }

  const label = element.getAttribute('aria-label');
  if (label !== null) {
    const trimmed = normalizeName(label);
    if (trimmed !== '') return trimmed;
  }

  // The whole label rung is gated on the element TAKING its name from a label,
  // and that gate is load-bearing rather than an optimization. HTML calls
  // <button> "labelable", so the DOM cheerfully reports the enclosing <label>
  // in `button.labels` — but a button's accessible name comes from its own
  // content, and honouring `labels` there names the button after the field
  // beside it ('Full name Reset' for a Reset button). Fields take a label;
  // buttons speak for themselves.
  if (takesNameFromLabel(element)) {
    // Ask the DOM first: it already resolves both `for=` and wrapping.
    const labels = element.labels;
    if (labels != null && labels.length > 0) {
      const parts: string[] = [];
      for (let i = 0; i < labels.length; i += 1) {
        const node = labels[i];
        if (node !== undefined) parts.push(textOf(node));
      }
      const joined = normalizeName(parts.join(' '));
      if (joined !== '') return joined;
    } else {
      const wrapping = wrappingLabel(element);
      if (wrapping !== undefined) {
        const text = textOf(wrapping);
        if (text !== '') return text;
      }
    }
  }

  if (isInputButton(element)) {
    const value = element.value;
    if (typeof value === 'string') {
      const trimmed = normalizeName(value);
      if (trimmed !== '') return trimmed;
    }
  }

  const text = textOf(element);
  if (text !== '') return text;

  const title = element.getAttribute('title');
  if (title !== null) {
    const trimmed = normalizeName(title);
    if (trimmed !== '') return trimmed;
  }

  return '';
}
