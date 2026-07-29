import { describe, expect, it } from 'vitest';

import { buildOnboardingGraph } from '../src/app/graph.js';
import { HAND_PAGES } from '../src/app/pages.js';
import { describeSourcesContribution } from '../src/panels/sourcesContribution.js';

/**
 * The sources panel prints no number this file cannot derive. These assertions
 * are the same set differences the panel renders — if the demo's route table or
 * page blocks change, both move together or this fails.
 */
describe('what the sources contributed', () => {
  const reading = describeSourcesContribution({
    compiled: buildOnboardingGraph(),
    handPages: HAND_PAGES,
  });

  it('names the pages that exist only because a source said so', () => {
    expect(reading.pagesFromSources).toEqual(['done']);
    expect(reading.pagesHandAuthored).toEqual(['welcome', 'profile', 'plan', 'review']);
  });

  it('separates addresses that were BACKFILLED from addresses declared by hand', () => {
    expect(reading.routesBackfilled).toEqual([
      { page: 'welcome', route: '/' },
      { page: 'profile', route: '/profile' },
      { page: 'plan', route: '/plan' },
    ]);
    expect(reading.routesDeclaredByHand).toEqual([{ page: 'review', route: '/review' }]);
  });

  it('names the skills the journey list contributed — this app hand-authors none', () => {
    expect(reading.skillsFromJourneys.sort()).toEqual(['import-signup', 'signup']);
    expect(reading.skillsHandAuthored).toEqual([]);
  });

  /**
   * MUTATION PROOF for the sources layer. Delete the sources and this app does
   * not merely lose a page — it stops compiling, because `review.confirm-signup`
   * navigates to a page only the route table knows about. The panel prints the
   * compiler's own sentence rather than the demo's paraphrase of it.
   */
  it('does not compile at all without the sources, and says why in the library’s words', () => {
    expect(reading.withoutSources.compiled).toBe(false);
    if (reading.withoutSources.compiled) return;
    expect(reading.withoutSources.refusal).toContain("goTo unknown page 'done'");
    expect(reading.withoutSources.refusal).toContain('hcifootprint:');
  });

  it('refuses one page declared at two addresses, loudly, as drift made visible', () => {
    expect(reading.routeContradiction.compiled).toBe(false);
    if (reading.routeContradiction.compiled) return;
    expect(reading.routeContradiction.refusal).toContain('cannot live at two routes');
  });

  it('reports which call each claim came from, so the chip on screen can name it', () => {
    expect(reading.from).toContain('graph.spec.pages');
  });
});
