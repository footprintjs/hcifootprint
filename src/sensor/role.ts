/**
 * An element's ARIA role — the first half of the only locator vocabulary this
 * library has (atom/types.ts:71-75: "role + accessible name, never CSS classes").
 *
 * TWO SOURCES, IN ORDER, AND NOTHING ELSE:
 * 1. an explicit `role` attribute — the app said so, and the app wins;
 * 2. a SMALL, NAMED table of native HTML semantics.
 *
 * The table is deliberately short, and every row in it is a mapping HTML itself
 * publishes — a `<button>` IS a button, an `<a href>` IS a link. Elements
 * outside the table get NO role, which is the honest answer: the sensor then has
 * nothing to match on, the click becomes an off-graph report, and no ledger row
 * is invented. An unrecognized element must never be silently promoted to
 * "probably a button" — that guess would put a human's name on motion the sensor
 * did not actually recognize.
 *
 * `''` means "not a control", and callers read it that way: recognition walks
 * past it, and a click that never touches a role-bearing element is not reported
 * at all (clicking a paragraph is not an interaction the graph failed to
 * declare).
 */
import type { SensorElement } from './dom-port.js';

/** The `type` an <input> is treated as. HTML's own default is 'text'. */
function inputType(element: SensorElement): string {
  return (element.getAttribute('type') ?? 'text').trim().toLowerCase();
}

/** Native semantics for <input>, by type — the one tag whose role depends on an attribute. */
function inputRole(element: SensorElement): string {
  const type = inputType(element);
  if (type === 'button' || type === 'submit' || type === 'reset' || type === 'image') return 'button';
  if (type === 'checkbox') return 'checkbox';
  if (type === 'radio') return 'radio';
  if (type === 'search') return 'searchbox';
  if (type === 'number') return 'spinbutton';
  if (type === 'range') return 'slider';
  // 'hidden' has no role (it is not on screen), and neither does 'password' —
  // HTML-AAM maps it to nothing, and inventing 'textbox' there would let a
  // password field answer to a textbox locator.
  if (type === 'hidden' || type === 'password') return '';
  if (type === 'color' || type === 'file') return '';
  // text, email, tel, url, and the date/time family all present as a textbox.
  return 'textbox';
}

/**
 * The role this element presents, or `''` when the sensor has no honest answer.
 */
export function computeRole(element: SensorElement): string {
  // An explicit role attribute is a token LIST in ARIA; the first token that is
  // actually a token wins, exactly as a browser reads it.
  const declared = element.getAttribute('role');
  if (declared !== null) {
    const first = declared.trim().split(/\s+/)[0];
    if (first !== undefined && first !== '') return first.toLowerCase();
  }

  const tag = element.tagName.toLowerCase();
  if (tag === 'button') return 'button';
  // A bare <a> with no href is not a link — it is an anchor, and HTML says it
  // has no role. Matching it as one would let a decorative anchor answer to a
  // link locator.
  if (tag === 'a') return element.getAttribute('href') === null ? '' : 'link';
  if (tag === 'input') return inputRole(element);
  if (tag === 'textarea') return 'textbox';
  if (tag === 'select') {
    // A multi-select (or one showing more than a single row) is a listbox; the
    // ordinary dropdown is a combobox. Both readings come straight from the
    // attributes the author wrote.
    if (element.getAttribute('multiple') !== null) return 'listbox';
    const size = Number(element.getAttribute('size') ?? '1');
    return Number.isFinite(size) && size > 1 ? 'listbox' : 'combobox';
  }
  return '';
}
