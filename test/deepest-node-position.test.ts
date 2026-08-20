/**
 * WHERE THE READER IS, at the tier that owns it.
 *
 * A real consumer app declared `tabs:` and had nowhere to report them. It tried
 * the obvious door — `sync('run-detail.why')` — and the cursor went OFF-GRAPH,
 * which the library said out loud and correctly: an agent standing there is
 * served nothing, because actions are served from the PAGE. The library's own
 * answer for below-page position was `focus`, and focus moved only on `sync()`
 * and `fire()` — so a PERSON clicking a tab, which is the whole mixed-initiative
 * case, could never move it. That app's workaround was to mount the visible
 * node and serve its own `lookingAt` beside the library's `youAreOn`.
 *
 * So position has three tiers and now three doors:
 *
 *   page       sync('run-detail')             — the walker moves; serving follows
 *   container  observeFocus('run-detail.why') — where INSIDE it; serving does NOT move
 *   state      updateState(...)               — what is true in there; not position
 *
 * The rule the docs, the README, llms.txt, CLAUDE.md and the JSDoc all say in
 * the same words: **Sync pages; observe the deeper place. `sync()` moves the
 * walker and decides what is served; `observeFocus()` says which tab or area the
 * reader is in. Declare containers, and report the deepest one on screen.**
 *
 * MUTATION PROOFS. Let `observeFocus` move the cursor (call `sync` inside it)
 * and the "serving does not move" and "no transition" cases redden. Drop its
 * page check and the cross-page refusal goes silent — the case that keeps a
 * session from describing the wrong screen. Take the container arm out of
 * `sync()` and the trap comes back: an off-graph cursor serving nothing, with
 * no warning naming the door that works.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph, serveToAgent } from '../src/index.js';

const runsMap = () =>
  buildNavigationGraph('runs', {
    pages: {
      'run-list': { actions: { open: { does: 'Open a run', goTo: 'run-detail' } } },
      'run-detail': {
        actions: { export: { does: 'Export this run as JSON', writes: ['run.exported'] } },
        tabs: {
          why: { does: 'Why this step ran', actions: { 'open-slice': { does: 'Open the causal slice' } } },
          timeline: { does: 'The run timeline', actions: { scrub: { does: 'Scrub to a step' } } },
        },
        modals: { share: { does: 'Share this run', actions: { 'copy-link': { does: 'Copy the link' } } } },
      },
    },
  });

const session = (node = 'run-detail', onWarn: (m: string) => void = () => undefined) =>
  runsMap().createSession({ node, onWarn });
/** The position lines of the facts block — what the model actually reads. */
const position = (facts: string): string[] =>
  facts.split('\n').filter((line) => line.startsWith('You are on') || line.startsWith('Focus'));
const served = (s: ReturnType<typeof session>): string[] =>
  s.available().edges.map((edge) => edge.affordanceId).sort();

describe('a page-level sync is the whole answer, and it is a coarse one', () => {
  it('stops at the page: the open tab is nowhere in the facts', () => {
    const s = session('run-list');
    s.sync('run-detail');

    expect(position(s.groundTruth().text)).toEqual(['You are on: run-detail.']);
    expect(s.focus).toBe('run-detail');
    expect(s.lookingAt).toBeNull();
  });
});

describe('observeFocus — the deeper place, without moving the walker', () => {
  it('says which tab the reader is in, and changes not one served action', () => {
    const s = session();
    const before = served(s);
    s.observeFocus('run-detail.why');

    expect(s.node).toBe('run-detail'); // the walker did not move…
    expect(served(s)).toEqual(before); // …so neither did what is served
    expect(s.focus).toBe('run-detail.why');
    expect(s.lookingAt).toBe('run-detail.why');
    expect(position(s.groundTruth().text)).toEqual([
      'You are on: run-detail.',
      'Focus: run-detail.why.',
    ]);
  });

  it('is an observation, not motion: no transition, no version bump', () => {
    const s = session();
    const version = s.version;
    s.observeFocus('run-detail.why');

    expect(s.version).toBe(version); // a plan made before it is not stale
    expect(s.transitions()).toEqual([]);
    expect(s.commitLog()).toEqual([]);
  });

  it('lets a PERSON clicking a tab move it — the case a fire could never carry', () => {
    const s = session();
    s.observeFocus('run-detail.why', { principal: 'user' });
    s.observeFocus('run-detail.timeline', { principal: 'user' });

    expect(s.focusHistory).toEqual([
      { from: 'run-detail', to: 'run-detail.why', moved: true, cause: { kind: 'stimulus', principal: 'user' } },
      {
        from: 'run-detail.why',
        to: 'run-detail.timeline',
        moved: true,
        cause: { kind: 'stimulus', principal: 'user' },
      },
    ]);
  });

  it('defaults the mover to unknown — a bare observation says where, not who', () => {
    const s = session();
    s.observeFocus('run-detail.why');

    expect(s.focusHistory.at(-1)?.cause).toEqual({ kind: 'stimulus', principal: 'unknown' });
  });

  it('observing the page itself is how you say the reader came back up', () => {
    const s = session();
    s.observeFocus('run-detail.why');
    s.observeFocus('run-detail');

    expect(s.lookingAt).toBeNull();
    expect(position(s.groundTruth().text)).toEqual(['You are on: run-detail.']);
  });

  it('refuses a node this map does not declare, BY NAME', () => {
    const s = session();
    expect(() => s.observeFocus('run-detail.summary' as never)).toThrow(
      /unknown node 'run-detail.summary'/,
    );
    expect(s.lookingAt).toBeNull();
  });

  it('refuses a node on another page, and names the sync that would fix it', () => {
    const s = session();
    expect(() => s.observeFocus('run-list')).toThrow(/names a node on page 'run-list'/);
    expect(() => s.observeFocus('run-list')).toThrow(/sync\('run-list'\) first/);
  });

  it('walks home from a container the app also says is not there', () => {
    // Told the reader is in a modal nobody opened: accepted, then resolved by
    // the ancestor fallback rather than believed. A closed modal cannot hold
    // anyone, and `show()` is what opens one.
    const s = session();
    s.observeFocus('run-detail.share');
    expect(s.lookingAt).toBeNull();

    s.show('run-detail.share');
    expect(s.lookingAt).toBe('run-detail.share');
  });
});

describe('the served answer carries both halves', () => {
  it('youAreOn is the page that serves; lookingAt is the deeper place, when there is one', () => {
    const s = session();
    const port = serveToAgent(s);

    expect(port.call('runs.whats_here', {})).not.toHaveProperty('lookingAt');
    s.observeFocus('run-detail.why');
    const here = port.call('runs.whats_here', {});
    expect(here['youAreOn']).toBe('run-detail');
    expect(here['lookingAt']).toBe('run-detail.why');
  });
});

describe('sync() with a container path does the safe thing, and says so', () => {
  it('syncs the page that owns it — never an off-graph cursor over a name the map knows', () => {
    const warnings: string[] = [];
    const s = session('run-list', (message) => warnings.push(message));
    const result = s.sync('run-detail.why');

    expect(result).toMatchObject({ changed: true, node: 'run-detail' });
    expect(result).not.toHaveProperty('offGraph');
    expect(s.node).toBe('run-detail');
    expect(served(s)).toContain('run-detail.export'); // a session that serves, not a dead one
    expect(s.lookingAt).toBeNull(); // and it did NOT quietly do observeFocus's job
  });

  it('names the door that actually reports the tab, once per path', () => {
    const warnings: string[] = [];
    const s = session('run-list', (message) => warnings.push(message));
    s.sync('run-detail.why');
    s.sync('run-detail.why');

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("sync('run-detail.why') names a tab, not a page");
    expect(warnings[0]).toContain("session.observeFocus('run-detail.why')");
    expect(warnings[0]).toContain('sync moves the walker');
  });

  it('leaves the undeclared path alone: the world is still allowed to be off-graph', () => {
    const s = session('run-list');
    const result = s.sync('/runs/42/some-view-nobody-declared');

    expect(result).toMatchObject({ changed: true, offGraph: true });
    expect(s.node).toBe('/runs/42/some-view-nobody-declared');
    expect(s.groundTruth().text).toContain('(an unmapped location, off the authored graph)');
  });
});

describe('the tiers keep their own doors', () => {
  it('show() says which tab is VISIBLE; observeFocus() says where the READER is', () => {
    const s = session();
    s.show('run-detail.why'); // visibility only — the exclusivity prior
    expect(s.lookingAt).toBeNull(); // …and it moves nobody
    expect(served(s)).not.toContain('run-detail.timeline.scrub');

    s.observeFocus('run-detail.why'); // position only
    expect(s.lookingAt).toBe('run-detail.why');
    expect(served(s)).not.toContain('run-detail.timeline.scrub'); // unchanged by the observation
  });
});
