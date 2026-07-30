/**
 * THE COPY AN APPROVAL BINDS TO.
 *
 * The gate proves a fire is the thing the human approved by comparing the fire's
 * payload against the input the ask recorded (approval-gate.ts whatDiffers →
 * same-input.ts). That proof is worth nothing when both sides are THE SAME
 * OBJECT. A caller that keeps its reference — an app holding its form state, a
 * relay reusing one args object for the ask and then the fire — can change the
 * payload after the human's yes, and the comparison still answers 'same' because
 * it is reading one object twice. The card said `{ total: 10 }`, the order went
 * out for 999999, and the journal read ask → approved → used with nothing wrong
 * in it.
 *
 * So the ask binds to a copy the caller cannot reach. That is the difference
 * between a comparison and a ceremony.
 *
 * WHY NOT "keep the reference when the copy fails" — the right answer for a
 * RECORD that only has to be readable later (session.ts cloneSafe), and the wrong
 * one here. A Proxy over a plain object renders faithfully through `sameInput`
 * (its prototype IS Object.prototype) and throws DataCloneError on
 * structuredClone — so the reference fallback would leave exactly this swap open
 * for the one input shape built to lie about itself. A value we cannot copy binds
 * to a stand-in nothing can ever match instead: `sameInput` answers
 * 'cannot-judge', the gate refuses APPROVAL_MISMATCH, and the caller re-asks with
 * a plain object. Refusing what it cannot prove is the whole job.
 *
 * WHY NOT the receipts snapshot (session.ts sanitizeProduced), which is also a
 * copy. That one is BOUNDED — depth 4, 30 items, 40 keys, 200 chars — because it
 * is what a card shows a person. Binding to a truncation would approve a fire
 * whose 31st item differs from the one on the card, which is why `sameInput`
 * refuses anything past those caps rather than comparing two truncations. The
 * binding copy is faithful or it is nothing.
 *
 * MUTATION PROOF: return `value` itself instead of the copy and
 * 'the input is swapped after the yes' (human-approval.test.ts) goes green as a
 * placed order for 999999.
 */

/**
 * The stand-in for an input this library could not copy faithfully.
 *
 * A symbol on purpose: `sameInput` renders every symbol as unjudgeable, so a
 * binding holding this can never compare 'same' — not even against itself. An
 * unprovable match is not a match, so it never becomes one by accident.
 */
export const UNCOPYABLE_INPUT: unique symbol = Symbol('hcifootprint: an input we could not copy');

/**
 * The detached input an approval binds to: a faithful copy, or a stand-in that
 * can never match. Never throws — `confirmAsk` is called mid-turn by a serving
 * layer and a card that cannot be raised is worse than one bound to nothing.
 */
export function boundInput(value: unknown): unknown {
  try {
    return structuredClone(value);
  } catch {
    // A function, a symbol, a Proxy, a host object. All of them are values the
    // human could not have been shown faithfully either.
    return UNCOPYABLE_INPUT;
  }
}
