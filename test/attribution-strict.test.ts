/**
 * `attributionPolicy: 'strict'` — THE FIRE STAYS UNRESOLVED RATHER THAN BEING
 * FALSELY CLOSED.
 *
 * The stamp (attribution-basis.test.ts) discloses that FIFO and signature
 * matching are guesses. This is the half that lets an integrator refuse them: no
 * settlement by arrival order, no signature association while anything else
 * could explain the delta, and an unplaceable report recorded as an unknown
 * stimulus with every pending fire left standing.
 *
 * THE TRADE IS THE REASON IT IS OPT-IN, and this suite states it out loud: a
 * fire whose report never arrives waits forever — visibly, in `pending()` and
 * `awaitingSettlement()` — instead of quietly borrowing the next report that
 * comes past. An app whose tap passes `transitionId` loses nothing at all.
 *
 * HALF THIS FILE IS THE DEFAULT, and that is deliberate: an enforcement that
 * arrives unrequested is a breaking change dressed as a safety feature, so every
 * strict case here has a default twin proving the old behaviour is untouched.
 *
 * MUTATION PROOFS (each one run; the count is what it actually did):
 * - Drop the `!this.#attributionStrict` guard on the FIFO arm → 3 red (the fire
 *   is closed by arrival order, and the pending list empties).
 * - Delete the `touching.length === 1` rule in soleSignatureMatch → 2 red (the
 *   overlapping neighbour, in the session and in the pure question).
 * - Make 'strict' the default (`opts.attributionPolicy !== 'default'`) → 1 red.
 *   Only one, and the reason is worth knowing: with FIFO gone the SIGNATURE
 *   rung still places most well-formed reports, so the default half of this
 *   file is sensitive to strict exactly where ambiguity exists — which is the
 *   only place the two policies differ.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph } from '../src/index.js';
import type { InteractionSession } from '../src/index.js';
import { soleSignatureMatch } from '../src/traverse/attribution.js';

/**
 * Two controls whose declared writes OVERLAP on one key — the shape that makes
 * "which fire was this report about?" a real question rather than a formality.
 */
function desk(policy?: 'default' | 'strict'): InteractionSession {
  const graph = buildNavigationGraph('desk', {
    pages: {
      desk: {
        actions: {
          save: { does: 'Save the draft', writes: ['draft.saved'] },
          publish: { does: 'Publish the draft', writes: ['draft.saved', 'draft.live'] },
        },
      },
    },
  });
  const session = graph.createSession({
    node: 'desk',
    state: { 'draft.saved': false, 'draft.live': false },
    ...(policy !== undefined ? { attributionPolicy: policy } : {}),
  });
  session.registerHandlers({
    group: 'app',
    handlers: { 'desk.save': () => undefined, 'desk.publish': () => undefined },
  });
  return session;
}

/** Fire, then let the handler finish — so the pending is not in flight. */
async function firedAndSettledHandler(session: InteractionSession, actionId: string): Promise<string> {
  const fired = session.fire(actionId, { source: 'agent' });
  if (!fired.ok) throw new Error(`the fire of '${actionId}' was refused: ${fired.reason}`);
  await Promise.resolve();
  await Promise.resolve();
  return fired.transition.id;
}

// ---------------------------------------------------------------------------
// The default is untouched
// ---------------------------------------------------------------------------

describe('the default policy is what every earlier release did', () => {
  it('still settles the oldest pending fire from a report that named nothing', async () => {
    const session = desk();
    const id = await firedAndSettledHandler(session, 'desk.save');

    const update = session.updateState({ 'draft.saved': true });

    expect(update.ok && update.attributed).toBe(true);
    expect(update.ok && update.transition.id).toBe(id);
    expect(session.pending()).toEqual([]);
  });

  it('still settles an ambiguous signature — one covered candidate is enough', async () => {
    const session = desk();
    const saveId = await firedAndSettledHandler(session, 'desk.save');
    // `publish` writes 'draft.saved' too, so this delta touches BOTH — the
    // default policy does not ask that question.
    await firedAndSettledHandler(session, 'desk.publish');

    const update = session.updateState({ 'draft.saved': true });

    // FIFO gets there first under the default: the oldest fire, by order.
    expect(update.ok && update.transition.id).toBe(saveId);
  });

  it('names the same policy explicitly and behaves identically', async () => {
    const session = desk('default');
    const id = await firedAndSettledHandler(session, 'desk.save');

    const update = session.updateState({ 'draft.saved': true });

    expect(update.ok && update.transition.id).toBe(id);
  });
});

// ---------------------------------------------------------------------------
// Strict: no settlement by arrival order
// ---------------------------------------------------------------------------

describe('strict refuses to close a fire on arrival order', () => {
  it('records the motion as an unknown stimulus and leaves the fire pending', async () => {
    const session = desk('strict');
    const id = await firedAndSettledHandler(session, 'desk.publish');

    // 'draft.live' alone does not COVER publish's declared writes, so no
    // signature matches — under the default this would be FIFO's.
    const update = session.updateState({ 'draft.live': true });

    expect(update.ok && update.attributed).toBe(false);
    expect(update.ok && update.transition.cause.kind).toBe('stimulus');
    expect(update.ok && update.transition.attribution).toEqual({
      principal: 'unknown',
      basis: 'unknown',
      certainty: 'unknown',
    });
    // THE TRADE, visible: the fire is still out there and the library says so.
    expect(session.pending().map((row) => row.id)).toEqual([id]);
    expect(session.awaitingSettlement()).toContain(id);
  });

  it('still moves state — an unplaceable report is recorded, never dropped', async () => {
    const session = desk('strict');
    await firedAndSettledHandler(session, 'desk.publish');

    session.updateState({ 'draft.live': true });

    expect(session.state()['draft.live']).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Strict: a signature must be unambiguous
// ---------------------------------------------------------------------------

describe('strict associates by signature only when nothing else could explain it', () => {
  it('settles the one fire the delta covers when it is alone', async () => {
    const session = desk('strict');
    const id = await firedAndSettledHandler(session, 'desk.save');

    const update = session.updateState({ 'draft.saved': true });

    expect(update.ok && update.attributed).toBe(true);
    expect(update.ok && update.transition.id).toBe(id);
    expect(update.ok && update.transition.attribution).toMatchObject({
      basis: 'signature-match',
      certainty: 'inferred',
    });
  });

  it('refuses when a neighbour’s writes even PARTLY explain the same report', async () => {
    const session = desk('strict');
    const saveId = await firedAndSettledHandler(session, 'desk.save');
    const publishId = await firedAndSettledHandler(session, 'desk.publish');

    // Covers `save` exactly; `publish` declares 'draft.saved' too, so it is a
    // plausible source of this very report. Two candidates, no way to tell.
    const update = session.updateState({ 'draft.saved': true });

    expect(update.ok && update.attributed).toBe(false);
    // MUTATION PROOF: delete the `touching.length === 1` rule and one of these
    // two fires is closed by a shape.
    expect(session.pending().map((row) => row.id)).toEqual([saveId, publishId]);
  });

  it('leaves the precise rungs alone — a named report still settles under strict', async () => {
    const session = desk('strict');
    const saveId = await firedAndSettledHandler(session, 'desk.save');
    await firedAndSettledHandler(session, 'desk.publish');

    const update = session.updateState({ 'draft.saved': true }, { transitionId: saveId });

    expect(update.ok && update.attributed).toBe(true);
    expect(update.ok && update.transition.attribution).toMatchObject({
      basis: 'named-by-report',
      certainty: 'observed',
    });
  });

  it('leaves the handler window alone too', async () => {
    const graph = buildNavigationGraph('desk', {
      pages: { desk: { actions: { save: { does: 'Save', writes: ['draft.saved'] } } } },
    });
    const session = graph.createSession({
      node: 'desk',
      state: { 'draft.saved': false },
      attributionPolicy: 'strict',
    });
    session.registerHandlers({
      group: 'app',
      handlers: { 'desk.save': () => session.updateState({ 'draft.saved': true }) },
    });

    const fired = session.fire('desk.save', { source: 'agent' });
    if (!fired.ok) throw new Error('the fire was refused');
    await fired.whenSettled;

    expect(fired.transition.attribution).toMatchObject({
      basis: 'handler-window',
      certainty: 'observed',
    });
  });

  it('leaves the no-pendings inference arm alone — it already refuses ambiguity', () => {
    const session = desk('strict');

    // Nothing pending, and exactly ONE registered action's declared writes are
    // covered by this delta (`publish` also claims 'draft.live', so it is not).
    session.updateState({ 'draft.saved': true });

    const row = session.transitions().at(-1);
    expect(row?.cause.affordanceId).toBe('desk.save');
    expect(row?.cause.inferred).toBe(true);
    expect(row?.attribution).toEqual({
      principal: 'unknown',
      basis: 'signature-match',
      certainty: 'inferred',
    });
  });
});

// ---------------------------------------------------------------------------
// The rule itself, with no session in the room
// ---------------------------------------------------------------------------

describe('the signature rule, as a pure question', () => {
  const candidates = [
    { candidate: 'save', writes: ['a'] },
    { candidate: 'publish', writes: ['a', 'b'] },
  ];

  it('needs the delta to COVER a candidate’s declared writes', () => {
    expect(soleSignatureMatch(candidates, ['a'], false)).toBe('save');
    // A wider delta covers BOTH — and a rung that answered here would be
    // choosing between two true readings, which is what "sole" refuses.
    expect(soleSignatureMatch(candidates, ['a', 'b'], false)).toBeUndefined();
  });

  it('never matches a candidate that declares nothing — an empty signature matches everything', () => {
    expect(soleSignatureMatch([{ candidate: 'quiet', writes: [] }], ['a'], false)).toBeUndefined();
  });

  it('refuses two covered candidates in either mode', () => {
    const twins = [
      { candidate: 'one', writes: ['a'] },
      { candidate: 'two', writes: ['a'] },
    ];
    expect(soleSignatureMatch(twins, ['a'], false)).toBeUndefined();
    expect(soleSignatureMatch(twins, ['a'], true)).toBeUndefined();
  });

  it('refuses a partial overlap ONLY under strict', () => {
    expect(soleSignatureMatch(candidates, ['a'], false)).toBe('save');
    expect(soleSignatureMatch(candidates, ['a'], true)).toBeUndefined();
  });

  it('accepts under strict when nothing else touches the delta', () => {
    expect(soleSignatureMatch([candidates[1]], ['b', 'a'], true)).toBe('publish');
    expect(soleSignatureMatch([candidates[0]], ['a'], true)).toBe('save');
  });
});
