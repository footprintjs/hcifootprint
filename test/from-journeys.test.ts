/**
 * fromJourneys() — the journeys the app already owns become journeys, overlaid
 * on the spine. One authoring vocabulary (does/steps/when — the JourneyDef
 * shape), and one judge: a journey's MEANING is validated by the
 * compiler's existing journeys pass, so unknown and ambiguous steps die in the
 * builder's existing voice, not a second dialect of it.
 *
 * Every test is a mutation proof against pre-sources code: fromJourneys did
 * not exist, and `sources` on a def was a type error the runtime ignored.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph, fromJourneys } from '../src/index.js';

const PAGES = {
  catalog: {
    actions: {
      'add-to-cart': { does: 'Add the dress to the cart', writes: ['cart'] },
      'go-checkout': { does: 'Go to checkout', goTo: 'checkout' },
    },
  },
  checkout: {
    actions: { 'place-order': { does: 'Place the order', confirm: true } },
  },
};

describe('journeys declared away from the graph, and read back into it', () => {
  it('reads JourneyDef field names as-is and freezes the snapshot', () => {
    const journey = { does: 'Buy end to end', steps: ['add-to-cart'], when: { authenticated: { eq: true } } };
    const src = fromJourneys({ purchase: journey });
    expect(src.kind).toBe('journeys');
    expect(src.journeys.purchase).toEqual(journey);
    // Snapshot: the author's later edits change nothing that was read.
    journey.steps.push('place-order');
    journey.when.authenticated.eq = false;
    expect(src.journeys.purchase.steps).toEqual(['add-to-cart']);
    expect(src.journeys.purchase.when).toEqual({ authenticated: { eq: true } });
    expect(Object.isFrozen(src)).toBe(true);
    expect(Object.isFrozen(src.journeys.purchase)).toBe(true);
  });

  it('refuses journey names the compiler would refuse — journey ids feed MCP tool names', () => {
    expect(() => fromJourneys({ 'bad.id': { does: 'x', steps: ['a'] } })).toThrow(/reserved character/);
    expect(() => fromJourneys({ '': { does: 'x', steps: ['a'] } })).toThrow(/empty name\./);
  });

  it('refuses non-array steps with an OWNED error, not a bare TypeError', () => {
    expect(() => fromJourneys({ go: { does: 'x', steps: 'add-to-cart' as unknown as string[] } })).toThrow(
      /fromJourneys journey 'go': steps must be an array of step names\./,
    );
  });
});

describe('those journeys landing on a graph that was authored elsewhere', () => {
  it('journeys compile through the EXISTING journeys pass: suffix steps resolve, when becomes the precondition', () => {
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
    expect(graph.spec.journeys.purchase.steps).toEqual([
      'catalog.add-to-cart',
      'catalog.go-checkout',
      'checkout.place-order',
    ]);
    expect(graph.spec.journeys.purchase.precondition).toEqual({ authenticated: { eq: true } });
  });

  it('an unknown step dies in the builder\'s existing voice', () => {
    expect(() =>
      buildNavigationGraph('shop', {
        pages: PAGES,
        sources: [fromJourneys({ ghost: { does: 'x', steps: ['no-such-action'] } })],
      }),
    ).toThrow(/journey 'ghost' step 'no-such-action' matches no action/);
  });

  it('an ambiguous step dies in the builder\'s existing voice', () => {
    const graph = () =>
      buildNavigationGraph('shop', {
        pages: {
          a: { actions: { save: { does: 'Save A' } } },
          b: { actions: { save: { does: 'Save B' } } },
        },
        sources: [fromJourneys({ keep: { does: 'x', steps: ['save'] } })],
      });
    expect(graph).toThrow(/journey 'keep' step 'save' is ambiguous — qualify it/);
  });

  it('the object step form survives the snapshot, and the author cannot reach it after', () => {
    // A snapshot is a VALUE. The array was already copied; an object element is
    // a reference, so it is copied too — edit yours afterwards and the graph is
    // unmoved.
    const authored: Array<string | { step: string }> = [{ step: 'add-to-cart' }];
    const source = fromJourneys({ purchase: { does: 'Buy', steps: authored } });
    (authored[0] as { step: string }).step = 'something-else';

    const graph = buildNavigationGraph('shop', { pages: PAGES, sources: [source] });
    expect(graph.spec.journeys.purchase.steps).toEqual(['catalog.add-to-cart']);
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
