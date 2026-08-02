/**
 * tryJourneyPlan() — journeyPlan() for an id nobody in this codebase authored.
 *
 * The asymmetry it removes: commitJourney() answers an unknown journey with a
 * typed value while journeyPlan() threw, so a caller holding a model-supplied id
 * had to handle the same question two ways — and the throw is the one that is
 * easy to forget until it reaches production as an unhandled exception.
 *
 * Two things are pinned here beyond the happy path: the failure arm is
 * commitJourney's failure arm field for field (one vocabulary, not two), and
 * journeyPlan() still throws exactly as before (this is additive; nobody's
 * catch block changes meaning).
 */
import { describe, expect, it } from 'vitest';
import { shop, initialState } from './fixture.js';
import type { Session } from '../src/index.js';

const session = (): Session => shop().createSession({ node: 'catalog', state: initialState });

describe('asking for a plan with an id the caller did author', () => {
  it('returns the same plan journeyPlan() builds', () => {
    const s = session();
    const tried = s.tryJourneyPlan('purchase');

    expect(tried.ok).toBe(true);
    if (!tried.ok) throw new Error('unreachable');
    expect(tried.plan).toEqual(s.journeyPlan('purchase'));
    expect(tried.plan.journeyId).toBe('purchase');
    expect(tried.plan.steps.map((step) => step.affordanceId)).toEqual([
      'add-to-cart',
      'go-to-cart',
      'proceed-to-checkout',
      'place-order',
    ]);
  });

  it('reads live status, like journeyPlan — it is the same computation, not a cached copy', () => {
    const s = session();
    const blocked = s.tryJourneyPlan('purchase');
    if (!blocked.ok) throw new Error('unreachable');
    expect(blocked.plan.steps[0]?.status).toBe('blocked'); // not authenticated yet

    s.updateState({ authenticated: true });
    const ready = s.tryJourneyPlan('purchase');
    if (!ready.ok) throw new Error('unreachable');
    expect(ready.plan.steps[0]?.status).toBe('ready');
  });
});

describe('asking for a plan with an id a MODEL supplied — answered, never thrown at', () => {
  it('answers with a value that names what IS known', () => {
    expect(session().tryJourneyPlan('ghost')).toEqual({
      ok: false,
      reason: 'UNKNOWN_JOURNEY',
      known: ['purchase'],
    });
  });

  it('speaks commitJourney()`s exact vocabulary for the same question', () => {
    const s = session();
    const tried = s.tryJourneyPlan('ghost');
    const committed = s.commitJourney('ghost');
    expect(tried).toEqual(committed); // one shape for "no such journey", not two
  });

  it('answers, rather than crashing, for an id that names an Object prototype member', () => {
    // The whole point of this method is untrusted ids: a model, a URL segment,
    // a config file. `journeys['constructor']` is truthy on a plain object, so a
    // truthiness lookup would sail past the guard and die reading `.steps` off
    // Object's constructor — a TypeError where the caller asked a question.
    const s = session();
    for (const id of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
      expect(s.tryJourneyPlan(id)).toMatchObject({ ok: false, reason: 'UNKNOWN_JOURNEY' });
    }
  });
});

describe('the in-library door still THROWS on an id nobody authored', () => {
  it('still throws, with the same message', () => {
    expect(() => session().journeyPlan('ghost')).toThrow(
      "hcifootprint: unknown journey 'ghost'. Known: purchase.",
    );
  });
});
