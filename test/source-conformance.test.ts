/**
 * conformSource — a source adapter cannot silently drop a declarable field.
 *
 * The bug class, restated as tests: a source threads somebody else's declaration
 * through copy points, a dropped field does not error, and the app then declares
 * something the agent never sees. Every law below is a sentence from that:
 *
 * - the MANIFEST cannot fall behind `ActionDef` or either of its extension points
 *   (a type-level lock, plus a runtime pin that every entry is a real key);
 * - a lossless source reports `dropped: []`;
 * - a lossy one is named, field by field, at the seam that lost it;
 * - `expectConformance` names EVERY dropped field in one message;
 * - all three first-party sources pass, and every field they legitimately cannot
 *   carry is EXCLUDED with a stated reason rather than passed over in silence;
 * - `fromRoutes`'s conformance is its refusal law: an action-shaped key is refused
 *   BY NAME rather than read-and-discarded;
 * - the helper mutates neither the source nor the graph it builds.
 *
 * Mutation proof: before this change the module did not exist and nothing asked a
 * source whether its declarations arrived.
 */
import { describe, expect, it } from 'vitest';
import { fromJourneys, fromLiveStore, fromReactRouter, fromRoutes, GraphValidationError } from '../src/index.js';
import type { JourneysSource, LiveBindingPort, LiveSource } from '../src/index.js';
import { conformSource, expectConformance, DECLARABLE_ACTION_FIELDS } from '../src/testing/index.js';
import type { ConformanceFixture, FullActionDef, SourceUnderTest } from '../src/testing/index.js';

// ---------------------------------------------------------------------------
// helpers — hand-rolled sources, the way a consumer writes one
// ---------------------------------------------------------------------------

/**
 * A live source that threads the WHOLE declaration through, faithfully. This is
 * what a correct adapter looks like: the fixture's action goes in, minus only the
 * two addressing fields a live registration expresses differently.
 */
function losslessSource(fixture: ConformanceFixture): LiveSource {
  return {
    kind: 'live',
    attach(session: LiveBindingPort) {
      const { on: _on, ...declaration } = fixture.action;
      const handle = session.registerActions(fixture.page, {
        actions: { [fixture.name]: declaration },
      });
      return () => handle.unregister();
    },
  };
}

/**
 * THE DELIBERATELY LOSSY ONE — two real adapter bugs, one per seam.
 *
 * `verify` is dropped outright, so it never reaches the compiled record at all.
 * `blockedBecause` is WRAPPED in a reader the adapter got wrong: a reader is a
 * legal authored form, so the declaration compiles — and a reader that throws
 * serves NO KEY, so the app's reason never reaches the row. One field lost at
 * compile, one lost at serve, from a source that looks fine either side of the
 * line you happen to be reading.
 */
function lossySource(fixture: ConformanceFixture): LiveSource {
  return {
    kind: 'live',
    attach(session: LiveBindingPort) {
      const { on: _on, verify: _verify, ...declaration } = fixture.action;
      const handle = session.registerActions(fixture.page, {
        actions: {
          [fixture.name]: {
            ...declaration,
            blockedBecause: () => {
              throw new Error('the adapter wrapped the app’s reader badly');
            },
          },
        },
      });
      return () => handle.unregister();
    },
  };
}

/** A source that carries the one required field and drops everything else. */
function bareSource(fixture: ConformanceFixture): LiveSource {
  return {
    kind: 'live',
    attach(session: LiveBindingPort) {
      const handle = session.registerActions(fixture.page, {
        actions: { [fixture.name]: { does: fixture.action.does } },
      });
      return () => handle.unregister();
    },
  };
}

/** Capture the fixture the helper generates, without changing what is tested. */
function captureFixture(build: (fixture: ConformanceFixture) => LiveSource): ConformanceFixture {
  let seen: ConformanceFixture | undefined;
  conformSource((fixture) => {
    seen = fixture;
    return build(fixture);
  });
  return seen!;
}

// ---------------------------------------------------------------------------
// 1. the manifest cannot drift
// ---------------------------------------------------------------------------

describe('the declarable-field manifest is locked to the declaration itself', () => {
  // THE TYPE-LEVEL LOCK, asserted from outside the module that owns it: a field
  // added to ActionDef, to the root-level `on` extension, or to the mount-time
  // `handler` extension makes one of these unions real and STOPS THE BUILD with
  // the field's own name in the error text. `npx tsc -p tsconfig.test.json` is
  // where this test runs; vitest only proves the file loaded.
  type Missing = Exclude<keyof FullActionDef, (typeof DECLARABLE_ACTION_FIELDS)[number]>;
  type Extra = Exclude<(typeof DECLARABLE_ACTION_FIELDS)[number], keyof FullActionDef>;
  const nothingMissing: Missing extends never ? true : ['field missing from the manifest', Missing] = true;
  const nothingExtra: Extra extends never ? true : ['manifest names a field that does not exist', Extra] = true;

  it('compiles only while the manifest and the declaration agree', () => {
    expect(nothingMissing).toBe(true);
    expect(nothingExtra).toBe(true);
  });

  it('names only real keys, once each', () => {
    // A fully-populated declaration, typed — so this sample cannot itself drift
    // from the type it stands for.
    const populated: Required<FullActionDef> = {
      does: 'A control',
      binding: { kind: 'programmatic', provider: 'p' },
      when: { k: { eq: true } },
      enabledWhen: { k: { eq: true } },
      blockedBecause: { says: 'waiting', clearedBy: 'app' },
      writes: ['k'],
      reads: ['k'],
      goTo: 'elsewhere',
      confirm: true,
      input: 'none',
      verify: { k: { eq: true } },
      humanDecides: { about: 'which one' },
      role: 'action',
      on: 'home',
      handler: () => undefined,
    };
    expect([...DECLARABLE_ACTION_FIELDS].sort()).toEqual(Object.keys(populated).sort());
    expect(new Set(DECLARABLE_ACTION_FIELDS).size).toBe(DECLARABLE_ACTION_FIELDS.length);
  });

  it('populates every manifest field in the fixture it feeds through a source', () => {
    const fixture = captureFixture(losslessSource);
    const declaration = fixture.action as unknown as Record<string, unknown>;
    for (const field of DECLARABLE_ACTION_FIELDS) {
      expect(declaration[field], `the fixture declares '${field}'`).toBeDefined();
    }
    // The handler sentinel is a REAL handler, not a placeholder that would throw
    // the moment the library called it.
    expect(fixture.action.handler!()).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 2. a lossless source reports nothing
// ---------------------------------------------------------------------------

describe('a source that threads the whole declaration reports nothing dropped', () => {
  it('drops nothing, and says what it actually checked', () => {
    const report = conformSource(losslessSource);
    expect(report.dropped).toEqual([]);
    // A pass with an empty denominator would be the same silence one level up.
    expect(report.checked.length).toBeGreaterThan(0);
    expect(report.checked).toContainEqual({ field: 'verify', seam: 'compile' });
    expect(report.checked).toContainEqual({ field: 'blockedBecause', seam: 'serve' });
  });

  it('states a reason for every field/seam pair it could not read', () => {
    const report = conformSource(losslessSource);
    // The four stated absences: the app's own post-settlement check never rides
    // a row, `on` is the root-attach extension no first-party source
    // contributes, and a handler never crosses the wire.
    //
    // `writes.serve` LEFT THIS LIST when the write side reached the agent's row
    // — a declared write is now readable where a declared read is, so an
    // adapter that drops it is caught at both seams rather than one.
    expect(report.excluded.map((row) => `${row.field}.${row.seam}`).sort()).toEqual([
      'handler.serve',
      'on.compile',
      'on.serve',
      'verify.serve',
    ]);
    for (const row of report.excluded) expect(row.because.length).toBeGreaterThan(20);
  });

  it('accepts a page name of the consumer’s choosing', () => {
    const report = conformSource(losslessSource, { page: 'checkout' });
    expect(report.dropped).toEqual([]);
    expect(captureFixtureOn('checkout').actionId.startsWith('checkout.')).toBe(true);
  });

  function captureFixtureOn(page: string): ConformanceFixture {
    let seen: ConformanceFixture | undefined;
    conformSource((fixture) => {
      seen = fixture;
      return losslessSource(fixture);
    }, { page });
    return seen!;
  }
});

// ---------------------------------------------------------------------------
// 3. a lossy source is named, field by field, at the seam that lost it
// ---------------------------------------------------------------------------

describe('a source that drops a field is named, at the seam that lost it', () => {
  it('reports exactly the two dropped fields, each at its own seam', () => {
    const report = conformSource(lossySource);
    expect([...report.dropped].sort((a, b) => a.field.localeCompare(b.field))).toEqual([
      { field: 'blockedBecause', seam: 'serve' },
      { field: 'verify', seam: 'compile' },
    ]);
  });

  it('reports a field once, at the FIRST seam that lost it', () => {
    // `does` never compiles here, so it cannot reach a row either. One row, at
    // the seam where the fix belongs.
    const report = conformSource(bareSource);
    expect(report.dropped.filter((row) => row.field === 'does')).toEqual([]);
    expect(report.dropped.filter((row) => row.field === 'binding')).toEqual([
      { field: 'binding', seam: 'compile' },
    ]);
    // Everything the bare declaration left out, and nothing it kept.
    expect(report.dropped.map((row) => row.field).sort()).toEqual(
      [
        'binding',
        'blockedBecause',
        'confirm',
        'enabledWhen',
        'goTo',
        'handler',
        'humanDecides',
        'input',
        'reads',
        'role',
        'verify',
        'when',
        'writes',
      ].sort(),
    );
  });

  it('reports every field when the source contributes nothing an agent can see', () => {
    const registersNothing: LiveSource = { kind: 'live', attach: () => () => undefined };
    const report = conformSource(() => registersNothing);
    // One answer — "no declaration arrived" — rather than fourteen guesses about
    // which copy point lost it.
    expect(report.dropped).toContainEqual({ field: 'does', seam: 'compile' });
    expect(report.dropped.length).toBe(report.checked.filter((row) => row.seam === 'compile').length);
  });
});

// ---------------------------------------------------------------------------
// 4. the gate names every dropped field in one message
// ---------------------------------------------------------------------------

describe('expectConformance is a gate that hides nothing', () => {
  it('throws naming EVERY dropped field and its seam, in one message', () => {
    let message = '';
    try {
      expectConformance(lossySource);
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain("'verify' (compile)");
    expect(message).toContain("'blockedBecause' (serve)");
    expect(message).toContain('dropped 2 declared field(s)');
    // The lesson, not just the list: a fix at one seam proves nothing about the next.
    expect(message).toMatch(/every copy point/);
  });

  it('returns quietly when nothing was dropped', () => {
    expect(() => expectConformance(losslessSource)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 5. the first-party sources, as law-pins
// ---------------------------------------------------------------------------

describe('every first-party source round-trips what it carries', () => {
  it('fromLiveStore threads the whole action declaration', () => {
    expect(() => expectConformance((fixture) => fromLiveStore(fixture.store))).not.toThrow();
  });

  it('fromJourneys round-trips the journey vocabulary and excludes action fields by name', () => {
    const report = conformSource((fixture) => fromJourneys(fixture.journeys));
    expect(report.dropped).toEqual([]);
    expect(report.checked.map((row) => row.field)).toEqual([
      'journey.does',
      'journey.does',
      'journey.steps',
      'journey.steps',
      'journey.when',
      'journey.when',
    ]);
    // Not silence: every action field it legitimately cannot carry says so.
    for (const field of DECLARABLE_ACTION_FIELDS) {
      const stated = report.excluded.filter((row) => row.field === field);
      expect(stated.length, `'${field}' is excluded with a reason`).toBe(2);
      expect(stated[0].because).toMatch(/contributes JOURNEYS, never action declarations/);
    }
  });

  it('fromRoutes round-trips the page vocabulary and excludes action fields by name', () => {
    const report = conformSource((fixture) => fromRoutes(fixture.routes));
    expect(report.dropped).toEqual([]);
    expect(report.checked).toEqual([
      { field: 'page.route', seam: 'compile' },
      { field: 'page.does', seam: 'compile' },
    ]);
    for (const field of DECLARABLE_ACTION_FIELDS) {
      const stated = report.excluded.filter((row) => row.field === field);
      expect(stated.length, `'${field}' is excluded with a reason`).toBe(2);
      expect(stated[0].because).toMatch(/contributes PAGES, never controls/);
    }
  });

  /**
   * BORN CONFORMANT — the second door into the routes kind is pinned by the same
   * run as the first, on the day it shipped. A route TREE composes and
   * transcribes its own page names, so this asks the question that matters for
   * an adapter that derives rather than copies: did the page the app declared
   * come out the other side under the id and label the derivation promised?
   */
  it('fromReactRouter round-trips the page vocabulary and excludes action fields by name', () => {
    const report = conformSource((fixture) => fromReactRouter(fixture.routeObjects));
    expect(report.dropped).toEqual([]);
    expect(report.checked).toEqual([
      { field: 'page.route', seam: 'compile' },
      { field: 'page.does', seam: 'compile' },
    ]);
    for (const field of DECLARABLE_ACTION_FIELDS) {
      const stated = report.excluded.filter((row) => row.field === field);
      expect(stated.length, `'${field}' is excluded with a reason`).toBe(2);
      expect(stated[0].because).toMatch(/contributes PAGES, never controls/);
      // Both doors into this source kind are named, so a reader of the report
      // never has to guess which factory the refusal law belongs to.
      expect(stated[0].because).toMatch(/fromReactRouter/);
    }
  });

  it('names a route-tree source that dropped the page it was handed', () => {
    const report = conformSource(() => fromReactRouter([{ path: '/somewhere' }]));
    expect(report.dropped).toEqual([
      { field: 'page.route', seam: 'compile' },
      { field: 'page.does', seam: 'compile' },
    ]);
  });

  it('names a journeys source that dropped the journey it was handed', () => {
    const report = conformSource(() => fromJourneys({}));
    expect(report.dropped).toEqual([
      { field: 'journey.does', seam: 'compile' },
      { field: 'journey.steps', seam: 'compile' },
      { field: 'journey.when', seam: 'compile' },
    ]);
  });

  it('names a routes source that dropped the page it was handed', () => {
    const report = conformSource(() => fromRoutes({ somewhere: '/somewhere' }));
    expect(report.dropped).toEqual([
      { field: 'page.route', seam: 'compile' },
      { field: 'page.does', seam: 'compile' },
    ]);
  });
});

// ---------------------------------------------------------------------------
// 6. fromRoutes: the refusal IS its conformance
// ---------------------------------------------------------------------------

describe('a route table refuses an action-shaped key by name — its conformance', () => {
  it('names the key it will not read, instead of discarding it silently', () => {
    // The table that does NOT come from a literal: a JSON blob, a generated
    // module, a value cast on the way in. Reading two keys and dropping the rest
    // is exactly the silence conformSource exists to end, one door down.
    const table = { catalog: { route: '/catalog', actions: { browse: { does: 'Browse' } } } } as unknown as Record<
      string,
      { route: string }
    >;
    expect(() => fromRoutes(table)).toThrow(GraphValidationError);
    expect(() => fromRoutes(table)).toThrow(/'actions' is not a key a route table declares/);
  });

  it('a route TREE refuses the same key by name, one door over', () => {
    // Same law, different door: on a route object the free-form slot is
    // `handle.hcifootprint`, and nothing typechecks it — so the refusal is the
    // only thing that can keep a declared control from vanishing.
    const tree = [{ path: '/catalog', handle: { hcifootprint: { actions: { browse: { does: 'Browse' } } } } }];
    expect(() => fromReactRouter(tree)).toThrow(GraphValidationError);
    expect(() => fromReactRouter(tree)).toThrow(/handle\.hcifootprint\.actions, which is not a key a route declares/);
  });

  it('says so in the conformance report too, so a reader never has to infer it', () => {
    const report = conformSource((fixture) => fromRoutes(fixture.routes));
    expect(report.excluded[0].because).toMatch(/refuses an action-shaped key BY NAME/);
  });
});

// ---------------------------------------------------------------------------
// 7. a source is a value — the helper changes nothing
// ---------------------------------------------------------------------------

describe('the helper mutates neither the source nor the graph it builds', () => {
  it('leaves the source value byte-identical, and answers the same twice', () => {
    // ONE source instance, run twice: a source is a value, so the second run must
    // find it exactly as the first left it — and must answer the same.
    let made: JourneysSource | undefined;
    const build = (fixture: ConformanceFixture): JourneysSource => {
      if (made === undefined) made = fromJourneys(fixture.journeys);
      return made;
    };
    const first = conformSource(build);
    const before = JSON.stringify(made);
    const second = conformSource(build);
    expect(JSON.stringify(made)).toBe(before);
    expect(second).toEqual(first);
  });

  it('leaves a live store’s published rows untouched', () => {
    const published = {
      node: 'conformance',
      name: 'conformance-action',
      does: 'A control the app publishes',
      writes: ['k'],
    };
    const before = JSON.stringify(published);
    conformSource(() => fromLiveStore({ subscribe: () => () => undefined, actions: () => [published] }));
    expect(JSON.stringify(published)).toBe(before);
  });
});

// ---------------------------------------------------------------------------
// 8. a source kind nobody declares
// ---------------------------------------------------------------------------

describe('a source tagged with a kind no graph source has is refused, not guessed at', () => {
  it('names the tag it was handed and the three that exist', () => {
    const bogus = () => ({ kind: 'rotues', pages: {} }) as unknown as ReturnType<SourceUnderTest>;
    expect(() => conformSource(bogus)).toThrow(/does not know the source kind 'rotues'/);
    expect(() => conformSource(bogus)).toThrow(/'routes', 'journeys' or 'live'/);
  });
});
