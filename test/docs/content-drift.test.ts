/**
 * THE CONTENT GATE — a doc that QUOTES the library must quote what the library
 * actually says, and a page that exists must be reachable.
 *
 * The link checker already proves every internal link resolves. It cannot see
 * the other two ways docs rot: a page nobody wired into the sidebar, and a
 * sentence copied out of the source that the source has since reworded. Both
 * have exactly one honest cure — assert against the real thing.
 *
 * Mutation proofs: every assertion below fails against the tree as it stood
 * before this documentation change — the two new pages are absent from their
 * meta.json files, the merge-order sentence lacks its link-tools clause in the
 * homes that had not been amended, and no page quoted the verify refusal, the
 * no-input refusal or the anti-narration line at all.
 *
 * NOT gated: docs/design/*.md. Those are dated records of what a numbered
 * design decided at the time ("Status: SHIPPED (0.4.x line)"); amending the
 * sentence inside one would falsify the record rather than update a doc.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildNavigationGraph, fromRoutes, skillsAsTools } from '../../src/index.js';
import { VERIFY_FAILED_EXPLANATION } from '../../src/traverse/verify.js';
import { checkNoInput } from '../../src/traverse/payload-shape.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DOCS = path.join(REPO, 'docs-next', 'content', 'docs');

const read = (relative: string): string => readFileSync(path.join(REPO, relative), 'utf8');
/** Prose compared as PROSE: line wrapping and comment markers are formatting, not meaning. */
const flatten = (text: string): string => text.replace(/[*>"]/g, ' ').replace(/\s+/g, ' ').trim();

describe('the sidebar and the filesystem agree', () => {
  const sections = ['get-started', 'build', 'serve', 'reference'];

  it.each(sections)('%s: every listed page exists and every page is listed', (section) => {
    const meta = JSON.parse(read(`docs-next/content/docs/${section}/meta.json`)) as { pages: string[] };
    // A meta entry may be a markdown link out of the tree ('[API Reference](/api)').
    const listed = meta.pages.filter((page) => !page.startsWith('['));
    const onDisk = readdirSync(path.join(DOCS, section))
      .filter((name) => name.endsWith('.mdx'))
      .map((name) => name.replace(/\.mdx$/, ''));
    expect([...listed].sort()).toEqual([...onDisk].sort());
  });

  it('the two pages this change adds are wired where they were asked for', () => {
    const build = JSON.parse(read('docs-next/content/docs/build/meta.json')) as { pages: string[] };
    const serve = JSON.parse(read('docs-next/content/docs/serve/meta.json')) as { pages: string[] };
    expect(build.pages).toContain('guarded-journeys');
    expect(build.pages.indexOf('guarded-journeys')).toBe(build.pages.indexOf('skills') + 1);
    expect(serve.pages.indexOf('grounding')).toBe(serve.pages.indexOf('receipts') + 1);
  });
});

describe('the merge order is ONE sentence, identical in every home that quotes it', () => {
  // Every live surface that prints it as current law. The docs page, the public
  // type it documents, the module that enforces it, the source-kind types, the
  // demo that runs it, and the suite that asserts it.
  const homes = [
    'docs-next/content/docs/build/graph-sources.mdx',
    'src/tree/types.ts',
    'src/graph/sources/merge.ts',
    'src/graph/sources/types.ts',
    'demos/onboarding-wizard/README.md',
    'demos/onboarding-wizard/src/app/graph.ts',
    'test/merge-sources.test.ts',
  ];

  /** The sentence itself, however the file happens to wrap or comment it. */
  const sentenceIn = (relative: string): string => {
    const flat = flatten(read(relative));
    const start = flat.indexOf('Pages first');
    const end = flat.indexOf('hand-authored tools win');
    expect(start, `${relative} does not quote the merge order`).toBeGreaterThanOrEqual(0);
    expect(end, `${relative} is missing the link-tools clause`).toBeGreaterThan(start);
    return flat.slice(start, end + 'hand-authored tools win'.length);
  };

  it('all seven homes carry byte-identical prose, link-tools clause included', () => {
    const [first, ...rest] = homes.map(sentenceIn);
    expect(first).toContain('Routes may also contribute link tools; hand-authored tools win');
    for (const [index, sentence] of rest.entries()) {
      expect(sentence, `${homes[index + 1]} drifted from ${homes[0]}`).toBe(first);
    }
  });
});

describe('a doc that quotes a refusal quotes the refusal the library emits', () => {
  const sessions = flatten(read('docs-next/content/docs/serve/sessions.mdx'));
  const journeys = flatten(read('docs-next/content/docs/build/guarded-journeys.mdx'));
  const grounding = flatten(read('docs-next/content/docs/serve/grounding.mdx'));
  const graph = flatten(read('docs-next/content/docs/build/navigation-graph.mdx'));

  it('the verify refusal sentence is the authored constant', () => {
    expect(sessions).toContain(flatten(VERIFY_FAILED_EXPLANATION));
    expect(journeys).toContain(flatten(VERIFY_FAILED_EXPLANATION));
  });

  it("the input:'none' refusal is what checkNoInput actually says", () => {
    const refusal = checkNoInput({ value: '' });
    expect(refusal.ok).toBe(false);
    expect(graph).toContain(flatten(refusal.ok ? '' : refusal.issues));
  });

  it('the facts header and the anti-narration line are the session’s own words', () => {
    const session = buildNavigationGraph('gate', { pages: { home: {} } }).createSession();
    const facts = session.groundTruth().text;
    const header = flatten(facts.split('\n')[0]);
    const nothingAttempted = 'No actions have been performed in this app this session.';

    expect(facts).toContain(nothingAttempted); // the library still says it…
    expect(journeys).toContain(header); // …and the pages quote it verbatim
    expect(journeys).toContain(nothingAttempted);
    expect(grounding).toContain(nothingAttempted);
    // The ranking clause is the part that makes the block a floor, not an opinion.
    expect(grounding).toContain(
      'these lines are what actually happened; the conversation is a claim about them',
    );
  });

  it('the pause sentences are the ones the port actually serves', () => {
    // Two authored constants a doc quotes verbatim: the one that tells a model
    // nothing happened, and the one that tells it a person — not a fix — is what
    // is missing. Reworded in modes.ts and not in the page, and the page would be
    // teaching a sentence no model ever receives.
    const session = buildNavigationGraph('shop', {
      pages: { checkout: { tools: { 'place-order': { does: 'Place the order', confirm: true } } } },
    }).createSession({ node: 'checkout', onWarn: () => undefined });
    const port = skillsAsTools(session);
    const asked = port.call('shop.do_action', { action: 'place-order' });
    const paused = port.call('shop.did_it_work', { transitionId: asked['askId'] as string });

    expect(flatten(read('docs-next/content/docs/serve/receipts.mdx'))).toContain(flatten(String(asked['why'])));
    // …and the page that teaches the whole surface quotes the same sentence.
    expect(flatten(read('docs-next/content/docs/serve/paused-not-failed.mdx'))).toContain(
      flatten(String(asked['why'])),
    );
    expect(flatten(read('docs-next/content/docs/serve/modes.mdx'))).toContain(
      flatten('Paused, not failed: no outcome exists because nothing was fired.'),
    );
    expect(String(paused['howToAct'])).toContain(
      'Paused, not failed: no outcome exists because nothing was fired.',
    );
  });

  it('the arrival sentences are the ones the port actually serves', async () => {
    // Two more authored constants quoted verbatim: what a navigation CLAIM means,
    // and what an OBSERVATION of it means. These two carry the release's most
    // easily-overstated fact — corroboration is not proof — so a rewording in
    // modes.ts that never reached the page would leave the page teaching a
    // stronger word than the model is ever handed.
    const session = buildNavigationGraph('shop', {
      pages: {
        catalog: { tools: { 'go-to-cart': { does: 'Open the cart', goTo: 'cart' } } },
        cart: { tools: { checkout: { does: 'Check out' } } },
      },
    }).createSession({ node: 'catalog', onWarn: () => undefined });
    session.registerToolGroup('catalog', { handlers: { 'go-to-cart': () => undefined } });
    const port = skillsAsTools(session);
    const id = port.call('shop.do_action', { action: 'go-to-cart' })['transitionId'] as string;
    await port.whenSettled(id);

    const claimed = port.call('shop.did_it_work', { transitionId: id });
    expect(claimed['arrival']).toBe('claimed');
    session.sync('cart'); // the app's own report — the only thing that corroborates
    const observed = port.call('shop.did_it_work', { transitionId: id });
    expect(observed['arrival']).toBe('observed');

    const page = flatten(read('docs-next/content/docs/serve/navigation-claims.mdx'));
    expect(page).toContain(flatten(String(claimed['arrivalMeans'])));
    expect(page).toContain(flatten(String(observed['arrivalMeans'])));
  });

  it('the stale-actions line the facts block prints is the one the page quotes', () => {
    // The page shows this line inside a code fence, as the thing a model will
    // read. It is authored on the library's side, so a rewording that never
    // reached the page would leave the page teaching a sentence nobody receives.
    const session = buildNavigationGraph('desk', {
      pages: { home: { tools: { look: { does: 'Look around' } } } },
    }).createSession({ node: 'home', onWarn: () => undefined });
    session.reportGap({
      request: 'live action store read failed; serving bindings from before the failure',
      principal: 'system',
      actionsMayBeStale: true,
    });
    const line = session
      .groundTruth()
      .text.split('\n')
      .find((row) => row.includes('could not re-read'))!;

    expect(flatten(read('docs-next/content/docs/build/live-bindings.mdx'))).toContain(flatten(line));
    // …and the row's own request — runtime text on any other source — does not cross.
    expect(session.groundTruth().text).not.toContain('serving bindings from before');
  });

  it('the dead-end warning names the same three fixes the docs name', () => {
    const warnings: string[] = [];
    const graphWithNothing = buildNavigationGraph('trap', {
      pages: { home: { tools: { look: { does: 'Look around' } } }, empty: {} },
    });
    const session = graphWithNothing.createSession({
      node: 'home',
      navigate: () => {
        /* armed: materialisation is a live question */
      },
      onWarn: (message) => warnings.push(message),
    });
    session.sync('empty');

    expect(warnings).toHaveLength(1);
    const liveBindings = read('docs-next/content/docs/build/live-bindings.mdx');
    for (const fix of ['registerToolGroup', 'navigate:', 'crossLinks: true']) {
      expect(warnings[0]).toContain(fix);
      expect(liveBindings).toContain(fix);
    }
  });
});

describe('the minted-destination cookbook quotes the refusals it teaches around', () => {
  // The whole page turns on two build-time refusals. A page that paraphrases
  // them teaches an author to search their console for a sentence nobody emits,
  // which is the same failure as a doc quoting a reworded runtime string.
  const page = flatten(read('docs-next/content/docs/serve/minted-destinations.mdx'));

  const threw = (act: () => unknown): string => {
    try {
      act();
    } catch (failure) {
      return (failure as Error).message;
    }
    throw new Error('the library no longer refuses this — the cookbook is teaching a dead rule');
  };

  it('the paramful url-binding refusal is the one the compiler throws', () => {
    const message = threw(() =>
      buildNavigationGraph('orders', {
        pages: {
          orders: {
            route: '/orders',
            tools: { open: { does: 'Open an order', binding: { kind: 'url', href: '/orders/:id' } } },
          },
          'order-detail': { route: '/orders/:id' },
        },
      }),
    );
    expect(page).toContain(flatten(message));
  });

  it('the crossLinks refusal is the one fromRoutes throws', () => {
    const message = threw(() =>
      fromRoutes({ orders: '/orders', 'order-detail': '/orders/:id' }, { crossLinks: ['order-detail'] }),
    );
    expect(page).toContain(flatten(message));
  });

  it('the shape the page teaches really works — a paramful PAGE is legal, and its claim is served', () => {
    // The page is a cookbook, so the recipe is run rather than described: a page
    // whose route carries a param compiles, an element-bound control claims it,
    // and the claim reaches the row a model reads.
    const graph = buildNavigationGraph('desk', {
      pages: {
        orders: {
          route: '/orders',
          tools: {
            'place-order': {
              does: 'Place the order',
              goTo: 'order-detail',
              binding: { kind: 'element', locator: { role: 'button', name: 'Place order' } },
            },
          },
        },
        'order-detail': { route: '/orders/:id' },
      },
    });
    const session = graph.createSession({ node: 'orders', onWarn: () => undefined });
    session.registerToolGroup('orders', { handlers: { 'place-order': () => ({ orderId: '8fa2' }) } });

    const row = skillsAsTools(session).call('desk.whats_here', {})['actions'] as Record<string, unknown>[];
    expect(row[0]!['goesTo']).toBe('order-detail');
    // …and the address the app mints is what the route table reads back.
    expect(session.sync('order-detail').node).toBe('order-detail');
  });
});

describe('the reading guide documents every stamp a served row can carry', () => {
  // The ask this page answers was for a `kind` enum. It was declined because the
  // kinds COMPOSE — so the page's claim is that the stamps ARE the taxonomy, and
  // a stamp the row can carry that the page never names would falsify exactly
  // that. Add a key to edgeData and this goes red naming it.
  const page = read('docs-next/content/docs/serve/reading-an-action-row.mdx');

  it('the four that compose are all true of one control at one moment', () => {
    const graph = buildNavigationGraph('shop', {
      pages: {
        checkout: {
          route: '/checkout',
          tools: {
            pay: {
              does: 'Pay for the order',
              confirm: true,
              goTo: 'receipt',
              enabledWhen: { 'checkout.address': { ne: '' } },
            },
          },
        },
        receipt: { route: '/receipt' },
      },
    });
    const session = graph.createSession({ node: 'checkout', state: { 'checkout.address': '' } });
    session.registerToolGroup('checkout', { handlers: { pay: () => undefined }, busy: { pay: 'Charging your card…' } });

    const row = (skillsAsTools(session).call('shop.whats_here', {})['actions'] as Record<string, unknown>[])[0]!;
    expect(row).toMatchObject({ goesTo: 'receipt', highEffect: true, enabled: false, busy: 'Charging your card…' });
    // The page's headline example is that row, so it has to BE that row.
    for (const [key, value] of Object.entries(row)) {
      expect(page, `the page's example no longer shows ${key}`).toContain(`"${key}": ${JSON.stringify(value)}`);
    }
  });

  it('every stamp key on a real row is named in the table', () => {
    const graph = buildNavigationGraph('desk', {
      pages: {
        home: {
          tools: {
            unbound: { does: 'Nothing is wired to this', when: { neverSeeded: { eq: true } } },
            typed: { does: 'Takes a payload', input: 'none' },
            box: { does: 'Holds a draft' },
          },
          areas: { cards: { repeats: true, tools: { remove: { does: 'Remove this card' } } } },
        },
      },
    });
    const session = graph.createSession({ node: 'home', onWarn: () => undefined });
    session.registerToolGroup('home', { handlers: { typed: () => undefined, box: () => undefined } });
    session.registerToolGroup('home.cards', { instance: 'c-1', handlers: { remove: () => undefined } });
    session.declareHolds('home.box', () => 'a draft');

    const rows = skillsAsTools(session).call('desk.whats_here', {})['actions'] as Record<string, unknown>[];
    const stamps = new Set(rows.flatMap((row) => Object.keys(row)));
    // The two identity keys are described in prose, not as stamps.
    stamps.delete('action');
    stamps.delete('does');
    expect(stamps.size).toBeGreaterThan(3); // a passing gate over an empty set is not a gate

    for (const stamp of stamps) {
      expect(page, `the reading guide never names the '${stamp}' stamp`).toContain(`**\`${stamp}`);
    }
  });
});

describe('the async recipe and the page under it teach the same sentences', () => {
  it('the page that names the ask-book arm quotes the sentence the port serves', () => {
    // waiting-for-the-app now names the fifth kind of waiting — a person — and
    // prints the howToAct a caller receives. It is an authored constant, so a
    // rewording that never reached the page leaves the page teaching a sentence
    // nobody is handed.
    const session = buildNavigationGraph('shop', {
      pages: { checkout: { tools: { 'place-order': { does: 'Place the order', confirm: true } } } },
    }).createSession({ node: 'checkout', onWarn: () => undefined });
    const port = skillsAsTools(session);
    const asked = port.call('shop.do_action', { action: 'place-order' });
    const paused = port.call('shop.did_it_work', { transitionId: asked['askId'] as string });

    expect(paused['judgment']).toBe('awaiting-human');
    expect(flatten(read('docs-next/content/docs/serve/waiting-for-the-app.mdx'))).toContain(
      flatten(String(paused['howToAct'])),
    );
  });

  it('the recipe points at the reference and the reference points back', () => {
    // Two pages over one subject is a maintenance hazard unless each says what
    // the other is for. Both directions are asserted so neither can be orphaned
    // by a later edit.
    expect(read('docs-next/content/docs/serve/going-async.mdx')).toContain('doc:waiting-for-the-app');
    expect(read('docs-next/content/docs/serve/waiting-for-the-app.mdx')).toContain('doc:going-async');
  });
});
