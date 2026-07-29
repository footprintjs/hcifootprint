/**
 * trySkillPlan() — skillPlan() for an id nobody in this codebase authored.
 *
 * The asymmetry it removes: commitSkill() answers an unknown skill with a
 * typed value while skillPlan() threw, so a caller holding a model-supplied id
 * had to handle the same question two ways — and the throw is the one that is
 * easy to forget until it reaches production as an unhandled exception.
 *
 * Two things are pinned here beyond the happy path: the failure arm is
 * commitSkill's failure arm field for field (one vocabulary, not two), and
 * skillPlan() still throws exactly as before (this is additive; nobody's
 * catch block changes meaning).
 */
import { describe, expect, it } from 'vitest';
import { shop, initialState } from './fixture.js';
import type { Session } from '../src/index.js';

const session = (): Session => shop().createSession({ node: 'catalog', state: initialState });

describe('trySkillPlan() — a known id', () => {
  it('returns the same plan skillPlan() builds', () => {
    const s = session();
    const tried = s.trySkillPlan('purchase');

    expect(tried.ok).toBe(true);
    if (!tried.ok) throw new Error('unreachable');
    expect(tried.plan).toEqual(s.skillPlan('purchase'));
    expect(tried.plan.skillId).toBe('purchase');
    expect(tried.plan.steps.map((step) => step.affordanceId)).toEqual([
      'add-to-cart',
      'go-to-cart',
      'proceed-to-checkout',
      'place-order',
    ]);
  });

  it('reads live status, like skillPlan — it is the same computation, not a cached copy', () => {
    const s = session();
    const blocked = s.trySkillPlan('purchase');
    if (!blocked.ok) throw new Error('unreachable');
    expect(blocked.plan.steps[0]?.status).toBe('blocked'); // not authenticated yet

    s.updateState({ authenticated: true });
    const ready = s.trySkillPlan('purchase');
    if (!ready.ok) throw new Error('unreachable');
    expect(ready.plan.steps[0]?.status).toBe('ready');
  });
});

describe('trySkillPlan() — an unknown id', () => {
  it('answers with a value that names what IS known', () => {
    expect(session().trySkillPlan('ghost')).toEqual({
      ok: false,
      reason: 'UNKNOWN_SKILL',
      known: ['purchase'],
    });
  });

  it('speaks commitSkill()`s exact vocabulary for the same question', () => {
    const s = session();
    const tried = s.trySkillPlan('ghost');
    const committed = s.commitSkill('ghost');
    expect(tried).toEqual(committed); // one shape for "no such skill", not two
  });

  it('answers, rather than crashing, for an id that names an Object prototype member', () => {
    // The whole point of this method is untrusted ids: a model, a URL segment,
    // a config file. `skills['constructor']` is truthy on a plain object, so a
    // truthiness lookup would sail past the guard and die reading `.steps` off
    // Object's constructor — a TypeError where the caller asked a question.
    const s = session();
    for (const id of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
      expect(s.trySkillPlan(id)).toMatchObject({ ok: false, reason: 'UNKNOWN_SKILL' });
    }
  });
});

describe('skillPlan() — unchanged', () => {
  it('still throws, with the same message', () => {
    expect(() => session().skillPlan('ghost')).toThrow(
      "hcifootprint: unknown skill 'ghost'. Known: purchase.",
    );
  });
});
