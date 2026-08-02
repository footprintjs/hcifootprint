/**
 * crossLinks — the route table may also contribute the one action a route can
 * honestly describe: "go to this address".
 *
 * The reported field failure this kills (from a production integration): a
 * fromRoutes table contributed 28 pages and ZERO actions. On a wizard page
 * whose only action was a file-select, the agent answered "there is NO action
 * that would take you to the Projects list" — correctly, on the information it
 * was given — and looped. The workaround was three hand-written nav actions
 * attached to all 28 pages.
 *
 * The stance: opt-in (inventing 28 actions nobody asked for is the other way to
 * be wrong), and the literal-address law decides what can be linked — a blanket
 * `true` FILTERS param routes, an explicit name REFUSES.
 *
 * Mutation proofs: before this change fromRoutes took one argument, a routes
 * source carried no crossLinks, mergeSources had no phase 2.5, and a
 * sources-only def compiled to ZERO affordances no matter what was asked.
 */
import { describe, expect, it } from 'vitest';
import { GraphValidationError, buildNavigationGraph, fromRoutes } from '../src/index.js';
import type { GraphSource, NavigationGraphDef } from '../src/index.js';

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

/** The reported shape: a spine read from the app's router, one param page among them. */
function appRoutes() {
  return {
    home: { route: '/', does: 'the dashboard' },
    projects: { route: '/projects', does: 'the Projects list' },
    wizard: '/projects/new',
    project: { route: '/projects/:id', does: 'one project' },
  };
}

/** The def as the app would write it: the spine from routes, one hand-authored page with the real work on it. */
function appDef(crossLinks: true | readonly ('home' | 'projects' | 'wizard' | 'project')[]): NavigationGraphDef {
  return {
    pages: { wizard: { actions: { 'pick-file': { does: 'Choose a file to upload' } } } },
    sources: [fromRoutes(appRoutes(), { crossLinks })],
  };
}

describe('the factory — what fromRoutes records, and what it refuses', () => {
  it('records the REQUEST, not actions — the factory sees one table, never the effective graph', () => {
    expect(fromRoutes(appRoutes(), { crossLinks: true }).crossLinks).toBe(true);
    expect(fromRoutes(appRoutes(), { crossLinks: ['projects'] }).crossLinks).toEqual(['projects']);
  });

  it('unasked is ABSENT, not false — a plain source stays byte-identical to pre-change', () => {
    const source = fromRoutes(appRoutes());
    expect('crossLinks' in source).toBe(false);
  });

  it('the request is a frozen SNAPSHOT — editing the array afterwards changes nothing', () => {
    const asked: ('home' | 'projects')[] = ['projects'];
    const source = fromRoutes(appRoutes(), { crossLinks: asked });
    asked.push('home');
    expect(source.crossLinks).toEqual(['projects']);
    expect(Object.isFrozen(source.crossLinks)).toBe(true);
  });

  it('refuses a name the table does not declare — loudly, at the call the author is looking at', () => {
    expect(() =>
      fromRoutes(appRoutes(), { crossLinks: ['projcts' as 'projects'] }),
    ).toThrow(/crossLinks names 'projcts', which this route table does not declare\. Known pages: home, projects, wizard, project\./);
  });

  it("refuses a NAMED page whose route has a ':param' — the library never guesses params", () => {
    expect(() => fromRoutes(appRoutes(), { crossLinks: ['project'] })).toThrow(
      /crossLinks names 'project', whose route '\/projects\/:id' has a ':param' segment/,
    );
  });

  it("a blanket `true` never refuses — a param page is a documented FILTER, not an author's error", () => {
    expect(() => fromRoutes(appRoutes(), { crossLinks: true })).not.toThrow();
  });
});

describe('materialisation — the links become ordinary root-level actions', () => {
  // Built per test, not once at describe scope: if the param filter ever broke,
  // compileTool would refuse the paramful href and a shared build would take
  // the whole FILE down as a collection error instead of naming the behaviour
  // that regressed.
  const graph = (): ReturnType<typeof buildNavigationGraph> => buildNavigationGraph('app', appDef(true));

  it('every literal-route page becomes one link; the param page is filtered out', () => {
    // MUTATION PROOF: this same table without crossLinks compiles to zero
    // affordances (test/from-routes.test.ts pins that) — a spine of places
    // with no way to walk between them.
    expect(Object.keys(graph().spec.affordances).sort()).toEqual([
      'go-to-home',
      'go-to-projects',
      'go-to-wizard',
      'wizard.pick-file',
    ]);
  });

  it('the link is exactly what an author would have written — url address, goTo claim, role next', () => {
    expect(graph().spec.affordances['go-to-projects']).toMatchObject({
      id: 'go-to-projects',
      description: 'Go to the Projects list',
      binding: { kind: 'url', href: '/projects' },
      effect: { navigatesTo: 'projects' },
      role: 'next', // derived from goTo, not declared — one rule, one place
    });
  });

  it("the description frames the table's own words; a bare route string falls back to the page id", () => {
    expect(graph().spec.affordances['go-to-wizard'].description).toBe('Go to wizard');
  });

  it('offered on every EFFECTIVE page except the target — hand-authored pages included', () => {
    // 'wizard' is hand-authored (it carries the real action) and still appears in
    // every other link's on-list: the effective page set is why materialisation
    // lives in the merge and not in the factory.
    expect(graph().spec.affordances['go-to-home'].on).toEqual(['projects', 'wizard', 'project']);
    expect(graph().spec.affordances['go-to-projects'].on).toEqual(['home', 'wizard', 'project']);
  });

  it('a page that cannot be a link TARGET is still a place you can stand', () => {
    // The param page gets no link OF ITS OWN, and still receives everyone else's.
    expect(graph().actionNodes['go-to-home']).toContain('project');
  });

  it('a named subset contributes exactly those, and nothing else', () => {
    const named = buildNavigationGraph('app', appDef(['projects']));
    expect(Object.keys(named.spec.affordances).sort()).toEqual(['go-to-projects', 'wizard.pick-file']);
  });

  it('a one-page table contributes nothing — there is nowhere to offer the link', () => {
    // Not a refusal and not a broken `on: []` action that would die in the
    // compiler naming an action the author never wrote: the link does not exist,
    // because no page exists it could have appeared on.
    const solo = buildNavigationGraph('app', { sources: [fromRoutes({ home: '/' }, { crossLinks: true })] });
    expect(Object.keys(solo.spec.affordances)).toEqual([]);
  });

  it('a def that never asked keeps its own actions untouched — key order and all', () => {
    const plain = buildNavigationGraph('app', {
      actions: {
        'open-help': { does: 'Open help', on: 'home' },
        'open-search': { does: 'Open search', on: 'home' },
      },
      sources: [fromRoutes({ home: '/', projects: '/projects' })],
    });
    expect(Object.keys(plain.spec.affordances)).toEqual(['open-help', 'open-search']);
  });
});

describe('merge order — "routes may also contribute link actions; hand-authored actions win"', () => {
  it('a hand-authored action with the same id wins SILENTLY (the journeys precedent)', () => {
    const graph = buildNavigationGraph('app', {
      pages: { wizard: { actions: { 'pick-file': { does: 'Choose a file to upload' } } } },
      actions: { 'go-to-projects': { does: 'Open the projects list in a side panel', on: 'wizard' } },
      sources: [fromRoutes(appRoutes(), { crossLinks: true })],
    });
    expect(graph.spec.affordances['go-to-projects']).toMatchObject({
      description: 'Open the projects list in a side panel',
      on: ['wizard'],
    });
    expect(graph.spec.affordances['go-to-projects'].binding).toBeUndefined(); // the author's action, whole
  });

  it('links come first and hand-authored actions after — one deterministic key order', () => {
    const graph = buildNavigationGraph('app', {
      actions: { 'open-help': { does: 'Open help', on: 'home' } },
      sources: [fromRoutes({ home: '/', projects: '/projects' }, { crossLinks: true })],
    });
    expect(Object.keys(graph.spec.affordances)).toEqual(['go-to-home', 'go-to-projects', 'open-help']);
  });

  it('a hand-crafted source with a nonsense crossLinks meets the library refusal, not a TypeError', () => {
    const smuggled = { kind: 'routes', pages: { home: { route: '/' } }, crossLinks: 'yes please' };
    expect(() =>
      buildNavigationGraph('app', { sources: [smuggled as unknown as GraphSource] }),
    ).toThrow(GraphValidationError);
    expect(() =>
      buildNavigationGraph('app', { sources: [smuggled as unknown as GraphSource] }),
    ).toThrow(/crossLinks is neither true nor an array of page names/);
  });

  it('a hand-crafted source naming a page it never declared is refused by the same door', () => {
    const smuggled = { kind: 'routes', pages: { home: { route: '/' } }, crossLinks: ['elsewhere'] };
    expect(() =>
      buildNavigationGraph('app', { sources: [smuggled as unknown as GraphSource] }),
    ).toThrow(/sources\[0\]: crossLinks names 'elsewhere', which that routes source does not declare/);
  });
});

describe('the links ride the EXISTING machinery — nothing downstream needed changing', () => {
  it("the B1 repro: on the wizard page the agent can now SEE the way to the Projects list", async () => {
    // MUTATION PROOF: before this change this page served exactly one edge —
    // 'wizard.pick-file' — and the agent's answer ("there is no action that
    // would take you to the Projects list") was TRUE. Now it is false.
    const seen: string[] = [];
    const session = buildNavigationGraph('app', appDef(true)).createSession({
      node: 'wizard',
      navigate: (href) => void seen.push(href),
    });
    expect(session.available().edges.map((edge) => edge.affordanceId)).toEqual([
      'wizard.pick-file',
      'go-to-home',
      'go-to-projects',
    ]);

    const fired = session.fire('go-to-projects', { source: 'agent' });
    expect(fired.ok).toBe(true);
    if (!fired.ok) return;
    const settled = await fired.whenSettled;
    // handlerFor synthesized `() => navigate('/projects')` from the url binding
    // — the same wire an explicit url action has used since 0.4.
    expect(settled.effectStatus).toBe('performed');
    expect(seen).toEqual(['/projects']);
    expect(session.node).toBe('projects');
  });

  it('without `navigate` the link refuses NOT_MATERIALIZED and the ledger names the missing wire', () => {
    const session = buildNavigationGraph('app', appDef(true)).createSession({ node: 'wizard' });
    expect(session.fire('go-to-projects', { source: 'agent' })).toEqual({
      ok: false,
      reason: 'NOT_MATERIALIZED',
      affordanceId: 'go-to-projects',
      gesture: { kind: 'url', href: '/projects' },
    });
    // gestureKind 'url' is the backlog row that says WHICH wiring is missing:
    // a navigate function, not a click handler.
    expect(session.gaps()).toMatchObject([
      { kind: 'fire-rejected', rejectionReason: 'NOT_MATERIALIZED', gestureKind: 'url' },
    ]);
  });

  it('a registered handler still wins over the synthesized navigation', async () => {
    const calls: string[] = [];
    const session = buildNavigationGraph('app', appDef(true)).createSession({
      node: 'wizard',
      navigate: () => void calls.push('navigate'),
    });
    session.registerHandlers({
      group: 'app-shell',
      handlers: { 'go-to-projects': () => void calls.push('handler') },
    });
    session.fire('go-to-projects', { source: 'agent' });
    await tick();
    expect(calls).toEqual(['handler']);
  });
});
