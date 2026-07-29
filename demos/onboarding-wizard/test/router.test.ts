import { describe, expect, it } from 'vitest';

import { buildOnboardingGraph } from '../src/app/graph.js';
import { createRouter, normalizePath } from '../src/app/router.js';
import { probeUrl } from '../src/panels/urlProbe.js';

describe('the app’s own router', () => {
  it('normalizes the three spellings of one place to one string', () => {
    expect(normalizePath('plan')).toBe('/plan');
    expect(normalizePath('/plan/')).toBe('/plan');
    expect(normalizePath('/plan')).toBe('/plan');
    expect(normalizePath('')).toBe('/');
    expect(normalizePath('/')).toBe('/');
  });

  it('keeps query and hash — they are the caller’s business, and matchRoute cuts them itself', () => {
    expect(normalizePath('/plan?ref=email')).toBe('/plan?ref=email');
    expect(normalizePath('/plan/?ref=email')).toBe('/plan?ref=email');
  });

  it('notifies on a real move and stays silent on a push to where we already are', () => {
    const router = createRouter('/');
    const seen: string[] = [];
    router.subscribe((path) => seen.push(path));

    router.push('/profile');
    router.push('/profile'); // same place
    router.push('profile/'); // same place, spelled differently
    router.push('/plan');

    expect(seen).toEqual(['/profile', '/plan']);
    expect(router.path()).toBe('/plan');
  });

  it('lets a listener unsubscribe mid-notification without skipping its neighbour', () => {
    const router = createRouter('/');
    const seen: string[] = [];
    const off = router.subscribe(() => off());
    router.subscribe((path) => seen.push(path));
    router.push('/plan');
    expect(seen).toEqual(['/plan']);
  });
});

/**
 * The single segment law: the table fromRoutes reads and the matcher that reads
 * URLs back share one reading, so a path cannot mean one thing to the router
 * and another to the graph.
 */
describe('URL round-trip through matchRoute', () => {
  const pages = buildOnboardingGraph().spec.pages;

  it('places every address the route table declared', () => {
    expect(probeUrl(pages, '/').page).toBe('welcome');
    expect(probeUrl(pages, '/profile').page).toBe('profile');
    expect(probeUrl(pages, '/plan').page).toBe('plan');
    expect(probeUrl(pages, '/review').page).toBe('review');
    expect(probeUrl(pages, '/done').page).toBe('done');
  });

  it('reads the trailing slash, the missing slash and the query string as the same place', () => {
    expect(probeUrl(pages, 'plan').page).toBe('plan');
    expect(probeUrl(pages, '/plan/').page).toBe('plan');
    expect(probeUrl(pages, '/plan?utm=x').page).toBe('plan');
  });

  it('answers nothing for a path it cannot place, and hands sync the RAW path', () => {
    const reading = probeUrl(pages, '/settings/billing');
    expect(reading.page).toBeNull();
    expect(reading.offGraph).toBe(true);
    expect(reading.handedToSync).toBe('/settings/billing');
  });

  it('hands sync the PAGE ID when it can place the path', () => {
    expect(probeUrl(pages, '/review').handedToSync).toBe('review');
  });
});
