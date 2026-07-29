/**
 * fromJourneys() — the journeys the app already owns become skills, overlaid
 * on the spine. One authoring vocabulary (does/steps/when — the JourneyDef
 * shape), and one judge: a journey's MEANING is validated by the
 * compiler's existing skills pass, so unknown and ambiguous steps die in the
 * builder's existing voice, not a second dialect of it.
 *
 * Every test is a mutation proof against pre-sources code: fromJourneys did
 * not exist, and `sources` on a def was a type error the runtime ignored.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph, fromJourneys } from '../src/index.js';

const PAGES = {
  catalog: {
    tools: {
      'add-to-cart': { does: 'Add the dress to the cart', writes: ['cart'] },
      'go-checkout': { does: 'Go to checkout', goTo: 'checkout' },
    },
  },
  checkout: {
    tools: { 'place-order': { does: 'Place the order', confirm: true } },
  },
};

describe('fromJourneys — the factory', () => {
  it('reads JourneyDef field names as-is and freezes the snapshot', () => {
    const journey = { does: 'Buy end to end', steps: ['add-to-cart'], when: { authenticated: { eq: true } } };
    const src = fromJourneys({ purchase: journey });
    expect(src.kind).toBe('journeys');
    expect(src.skills.purchase).toEqual(journey);
    // Snapshot: the author's later edits change nothing that was read.
    journey.steps.push('place-order');
    journey.when.authenticated.eq = false;
    expect(src.skills.purchase.steps).toEqual(['add-to-cart']);
    expect(src.skills.purchase.when).toEqual({ authenticated: { eq: true } });
    expect(Object.isFrozen(src)).toBe(true);
    expect(Object.isFrozen(src.skills.purchase)).toBe(true);
  });

  it('refuses journey names the compiler would refuse — skill ids feed MCP tool names', () => {
    expect(() => fromJourneys({ 'bad.id': { does: 'x', steps: ['a'] } })).toThrow(/reserved character/);
    expect(() => fromJourneys({ '': { does: 'x', steps: ['a'] } })).toThrow(/empty name\./);
  });

  it('refuses non-array steps with an OWNED error, not a bare TypeError', () => {
    expect(() => fromJourneys({ go: { does: 'x', steps: 'add-to-cart' as unknown as string[] } })).toThrow(
      /fromJourneys journey 'go': steps must be an array of step names\./,
    );
  });
});

describe('fromJourneys — the overlay, through buildNavigationGraph', () => {
  it('journeys compile through the EXISTING skills pass: suffix steps resolve, when becomes the precondition', () => {
    const graph = buildNavigationGraph('shop', {
      pages: PAGES,
      sources: [
        fromJourneys({
          purchase: {
            does: 'Buy a dress end to end',
            steps: ['add-to-cart', 'go-checkout', 'place-order'],
            when: { authenticated: { eq: true } },
          },
        }),
      ],
    });
    expect(graph.spec.skills.purchase.steps).toEqual([
      'catalog.add-to-cart',
      'catalog.go-checkout',
      'checkout.place-order',
    ]);
    expect(graph.spec.skills.purchase.precondition).toEqual({ authenticated: { eq: true } });
  });

  it('an unknown step dies in the builder\'s existing voice', () => {
    expect(() =>
      buildNavigationGraph('shop', {
        pages: PAGES,
        sources: [fromJourneys({ ghost: { does: 'x', steps: ['no-such-tool'] } })],
      }),
    ).toThrow(/skill 'ghost' step 'no-such-tool' matches no tool/);
  });

  it('an ambiguous step dies in the builder\'s existing voice', () => {
    const graph = () =>
      buildNavigationGraph('shop', {
        pages: {
          a: { tools: { save: { does: 'Save A' } } },
          b: { tools: { save: { does: 'Save B' } } },
        },
        sources: [fromJourneys({ keep: { does: 'x', steps: ['save'] } })],
      });
    expect(graph).toThrow(/skill 'keep' step 'save' is ambiguous — qualify it/);
  });

  it('a journey may only ADD — the page spine is untouched by the overlay', () => {
    const withJourney = buildNavigationGraph('shop', {
      pages: PAGES,
      sources: [fromJourneys({ purchase: { does: 'Buy', steps: ['add-to-cart'] } })],
    });
    const without = buildNavigationGraph('shop', { pages: PAGES });
    expect(JSON.stringify(withJourney.spec.pages)).toBe(JSON.stringify(without.spec.pages));
    expect(JSON.stringify(withJourney.spec.affordances)).toBe(JSON.stringify(without.spec.affordances));
  });
});
