/**
 * THE CONTENT GATE — a doc that QUOTES the library must quote what the library
 * actually says, and a page that exists must be reachable.
 *
 * The link checker already proves every internal link resolves. It cannot see
 * the other three ways docs rot: a page nobody wired into the sidebar, a
 * sentence copied out of the source that the source has since reworded, and a
 * SHAPE that no longer matches the shape the site claims to have. All three
 * have exactly one honest cure — assert against the real thing.
 *
 * WHY THE SHAPE IS GATED. The site organises itself around three contexts (map,
 * traversal, actions), each with the same three parts — declare it, wire it,
 * what the agent gets. That is a claim made to a reader deciding whether to
 * adopt, so it is asserted like any other claim. The previous split was by
 * PHASE (build it, then serve it): useful to whoever writes the library, and
 * meaningless to whoever is evaluating it.
 *
 * Mutation proofs: every assertion below fails against the tree as it stood
 * before this documentation change — the taxonomy page and its meta entry do
 * not exist, the top-level order is the build/serve split, the merge-order
 * sentence lacks its link-actions clause in the homes that had not been amended,
 * and no page quoted the verify refusal, the no-input refusal or the
 * anti-narration line at all.
 *
 * Pages are read BY ID (./doc-page.ts), never by folder: reorganising the
 * sidebar must not be able to redden a gate about content.
 *
 * NOT gated: docs/design/*.md. Those are dated records of what a numbered
 * design decided at the time ("Status: SHIPPED (0.4.x line)"); amending the
 * sentence inside one would falsify the record rather than update a doc.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildNavigationGraph, fromRoutes, serveToAgent } from '../../src/index.js';
import { VERIFY_FAILED_EXPLANATION } from '../../src/traverse/verify.js';
import { checkNoInput } from '../../src/traverse/payload-shape.js';
import { docPage, readDocPage } from './doc-page.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DOCS = path.join(REPO, 'docs-next', 'content', 'docs');

const read = (relative: string): string => readFileSync(path.join(REPO, relative), 'utf8');
/** Prose compared as PROSE: line wrapping and comment markers are formatting, not meaning. */
const flatten = (text: string): string => text.replace(/[*>"]/g, ' ').replace(/\s+/g, ' ').trim();

describe('the sidebar and the filesystem agree', () => {
  /**
   * Derived, not listed: a hard-coded section list stops gating the moment
   * someone adds a section, which is exactly when a gate is worth having.
   * `api/` is generated (gen-fumadocs-api.mjs owns its meta files).
   */
  const sections = readdirSync(DOCS, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== 'api')
    .map((entry) => entry.name);

  it('finds the sections at all (a passing gate over zero folders is not a gate)', () => {
    expect(sections.length).toBeGreaterThanOrEqual(5);
  });

  it.each(sections)('%s: every listed page exists and every page is listed', (section) => {
    const meta = JSON.parse(read(`docs-next/content/docs/${section}/meta.json`)) as { pages: string[] };
    // Two meta entries are not pages: a markdown link out of the tree
    // ('[API Reference](/api)') and a '---Separator---' heading.
    const listed = meta.pages.filter((page) => !page.startsWith('[') && !page.startsWith('---'));
    const onDisk = readdirSync(path.join(DOCS, section))
      .filter((name) => name.endsWith('.mdx'))
      .map((name) => name.replace(/\.mdx$/, ''));
    expect([...listed].sort()).toEqual([...onDisk].sort());
  });
});

describe('the three contexts ARE the shape of the documentation', () => {
  /**
   * The taxonomy is a claim the site makes to a reader deciding whether to adopt:
   * this library exposes three contexts, and each has the same three parts. A
   * sidebar that quietly reorganises around something else falsifies it, so the
   * structure is asserted rather than described.
   *
   * MUTATION PROOF: restore the build/serve split (grouping by PHASE) and every
   * case below goes red naming what is missing.
   */
  const meta = (section: string): { pages: string[] } =>
    JSON.parse(read(`docs-next/content/docs/${section}/meta.json`)) as { pages: string[] };
  const contexts = ['map', 'traversal', 'actions'];

  it('the top level is the three contexts, in the order an agent asks them', () => {
    expect(meta('.').pages).toEqual(['index', 'get-started', ...contexts, 'reference']);
  });

  it('the taxonomy is the FIRST thing a reader meets after the quick start', () => {
    expect(meta('get-started').pages.slice(0, 2)).toEqual(['quick-start', 'three-contexts']);
  });

  it.each(contexts)('%s: declarations come first and the served answer comes last', (context) => {
    const separators = meta(context).pages.filter((page) => page.startsWith('---'));
    expect(separators[0]).toBe('---Declare it---');
    expect(separators.at(-1)).toBe('---What the agent gets---');
    // Every page sits UNDER a separator — an unlabelled run is a page nobody
    // can place in the taxonomy the sidebar claims to be organised by.
    expect(meta(context).pages[0]!.startsWith('---')).toBe(true);
  });

  it('the phase folders are gone and every page they held is filed under a context', () => {
    const folders = readdirSync(DOCS, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
    // Grouping by PHASE (build it, then serve it) is useful to whoever writes
    // the library and meaningless to whoever is deciding whether to adopt it.
    expect(folders).not.toContain('build');
    expect(folders).not.toContain('serve');

    const filed = new Set(contexts.flatMap((context) => meta(context).pages));
    // One page from each half of the old split, plus the two derivations —
    // the pages whose home moving is the whole point of the restructure.
    for (const id of [
      'navigation-graph',
      'graph-sources',
      'sessions',
      'presence',
      'reading-an-action-row',
      'what-would-free-it',
      'how-to-reach',
      'modes',
    ]) {
      expect(filed, `${id} is not filed under any context`).toContain(id);
    }
  });

  it('the page that teaches the taxonomy carries all three questions verbatim', () => {
    const page = flatten(readDocPage('three-contexts'));
    for (const question of [
      'What can this app do?',
      'Where am I, and how do I get there?',
      'What is possible here?',
    ]) {
      expect(page).toContain(question);
    }
    // The rule that falls out of the taxonomy, and the fourth thing that is not
    // a context because nobody builds it.
    expect(page).toContain('Can this fact change while the page is open?');
    expect(page).toContain('whatUnblocks');
    expect(page).toContain('howToReach');
  });

  /**
   * THE TOOL LIST IS THE MAP — that page's own thesis — so the names it prints
   * are a claim about the wire, and the migration note tells hosts to re-pin
   * tool names on them. The block is ```ts twoslash, which gates the TYPES in
   * it; the comment beside the call is prose, and prose is where this drifted:
   * two of the four generics were shown unprefixed and the order was wrong.
   */
  it('the tool list that page prints is the tool list the port serves', () => {
    const graph = buildNavigationGraph('shop', {
      pages: { catalog: { actions: { 'add-to-cart': { does: 'Add the open dress to the cart' } } } },
      journeys: { purchase: { does: 'Buy a dress end to end', steps: ['add-to-cart'] } },
    });
    const served = serveToAgent(graph.createSession({ onWarn: () => undefined }))
      .tools()
      .map((tool) => tool.name)
      .join(' · ');
    expect(flatten(readDocPage('three-contexts'))).toContain(served);
  });
});

describe('the merge order is ONE sentence, identical in every home that quotes it', () => {
  // Every live surface that prints it as current law. The docs page, the public
  // type it documents, the module that enforces it, the source-kind types, the
  // demo that runs it, and the suite that asserts it.
  const homes = [
    docPage('graph-sources'),
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
    const end = flat.indexOf('hand-authored actions win');
    expect(start, `${relative} does not quote the merge order`).toBeGreaterThanOrEqual(0);
    expect(end, `${relative} is missing the link-actions clause`).toBeGreaterThan(start);
    return flat.slice(start, end + 'hand-authored actions win'.length);
  };

  it('all seven homes carry byte-identical prose, link-actions clause included', () => {
    const [first, ...rest] = homes.map(sentenceIn);
    expect(first).toContain('Routes may also contribute link actions; hand-authored actions win');
    for (const [index, sentence] of rest.entries()) {
      expect(sentence, `${homes[index + 1]} drifted from ${homes[0]}`).toBe(first);
    }
  });
});

describe('a doc that quotes a refusal quotes the refusal the library emits', () => {
  const sessions = flatten(readDocPage('sessions'));
  const journeys = flatten(readDocPage('guarded-journeys'));
  const grounding = flatten(readDocPage('grounding'));
  const graph = flatten(readDocPage('navigation-graph'));

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
      pages: { checkout: { actions: { 'place-order': { does: 'Place the order', confirm: true } } } },
    }).createSession({ node: 'checkout', onWarn: () => undefined });
    const port = serveToAgent(session);
    const asked = port.call('shop.do_action', { action: 'place-order' });
    const paused = port.call('shop.did_it_work', { transitionId: asked['askId'] as string });

    expect(flatten(readDocPage('receipts'))).toContain(flatten(String(asked['why'])));
    // …and the page that teaches the whole surface quotes the same sentence.
    expect(flatten(readDocPage('paused-not-failed'))).toContain(
      flatten(String(asked['why'])),
    );
    expect(flatten(readDocPage('modes'))).toContain(
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
        catalog: { actions: { 'go-to-cart': { does: 'Open the cart', goTo: 'cart' } } },
        cart: { actions: { checkout: { does: 'Check out' } } },
      },
    }).createSession({ node: 'catalog', onWarn: () => undefined });
    session.registerActions('catalog', { handlers: { 'go-to-cart': () => undefined } });
    const port = serveToAgent(session);
    const id = port.call('shop.do_action', { action: 'go-to-cart' })['transitionId'] as string;
    await port.whenSettled(id);

    const claimed = port.call('shop.did_it_work', { transitionId: id });
    expect(claimed['arrival']).toBe('claimed');
    session.sync('cart'); // the app's own report — the only thing that corroborates
    const observed = port.call('shop.did_it_work', { transitionId: id });
    expect(observed['arrival']).toBe('observed');

    const page = flatten(readDocPage('navigation-claims'));
    expect(page).toContain(flatten(String(claimed['arrivalMeans'])));
    expect(page).toContain(flatten(String(observed['arrivalMeans'])));
  });

  it('the stale-actions line the facts block prints is the one the page quotes', () => {
    // The page shows this line inside a code fence, as the thing a model will
    // read. It is authored on the library's side, so a rewording that never
    // reached the page would leave the page teaching a sentence nobody receives.
    const session = buildNavigationGraph('desk', {
      pages: { home: { actions: { look: { does: 'Look around' } } } },
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

    expect(flatten(readDocPage('live-bindings'))).toContain(flatten(line));
    // …and the row's own request — runtime text on any other source — does not cross.
    expect(session.groundTruth().text).not.toContain('serving bindings from before');
  });

  it('the dead-end warning names the same three fixes the docs name', () => {
    const warnings: string[] = [];
    const graphWithNothing = buildNavigationGraph('trap', {
      pages: { home: { actions: { look: { does: 'Look around' } } }, empty: {} },
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
    const liveBindings = readDocPage('live-bindings');
    for (const fix of ['registerActions', 'navigate:', 'crossLinks: true']) {
      expect(warnings[0]).toContain(fix);
      expect(liveBindings).toContain(fix);
    }
  });
});

describe('the minted-destination cookbook quotes the refusals it teaches around', () => {
  // The whole page turns on two build-time refusals. A page that paraphrases
  // them teaches an author to search their console for a sentence nobody emits,
  // which is the same failure as a doc quoting a reworded runtime string.
  const page = flatten(readDocPage('minted-destinations'));

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
            actions: { open: { does: 'Open an order', binding: { kind: 'url', href: '/orders/:id' } } },
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
          actions: {
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
    session.registerActions('orders', { handlers: { 'place-order': () => ({ orderId: '8fa2' }) } });

    const row = serveToAgent(session).call('desk.whats_here', {})['actions'] as Record<string, unknown>[];
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
  const page = readDocPage('reading-an-action-row');

  it('the four that compose are all true of one control at one moment', () => {
    const graph = buildNavigationGraph('shop', {
      pages: {
        checkout: {
          route: '/checkout',
          actions: {
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
    session.registerActions('checkout', { handlers: { pay: () => undefined }, busy: { pay: 'Charging your card…' } });

    const row = (serveToAgent(session).call('shop.whats_here', {})['actions'] as Record<string, unknown>[])[0]!;
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
          actions: {
            unbound: { does: 'Nothing is wired to this', when: { neverSeeded: { eq: true } } },
            typed: { does: 'Takes a payload', input: 'none' },
            box: { does: 'Holds a draft' },
          },
          areas: { cards: { repeats: true, actions: { remove: { does: 'Remove this card' } } } },
        },
      },
    });
    const session = graph.createSession({ node: 'home', onWarn: () => undefined });
    session.registerActions('home', { handlers: { typed: () => undefined, box: () => undefined } });
    session.registerActions('home.cards', { instance: 'c-1', handlers: { remove: () => undefined } });
    session.declareHolds('home.box', () => 'a draft');

    const rows = serveToAgent(session).call('desk.whats_here', {})['actions'] as Record<string, unknown>[];
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
      pages: { checkout: { actions: { 'place-order': { does: 'Place the order', confirm: true } } } },
    }).createSession({ node: 'checkout', onWarn: () => undefined });
    const port = serveToAgent(session);
    const asked = port.call('shop.do_action', { action: 'place-order' });
    const paused = port.call('shop.did_it_work', { transitionId: asked['askId'] as string });

    expect(paused['judgment']).toBe('awaiting-human');
    expect(flatten(readDocPage('waiting-for-the-app'))).toContain(
      flatten(String(paused['howToAct'])),
    );
  });

  it('the recipe points at the reference and the reference points back', () => {
    // Two pages over one subject is a maintenance hazard unless each says what
    // the other is for. Both directions are asserted so neither can be orphaned
    // by a later edit.
    expect(readDocPage('going-async')).toContain('doc:waiting-for-the-app');
    expect(readDocPage('waiting-for-the-app')).toContain('doc:going-async');
  });
});

describe('the homepage says the same true things to both readers', () => {
  /**
   * The site offers a developer reading and a business reading of the same
   * seven scenes. That is only safe while the two are the SAME CLAIM in
   * different language — the moment the business reading says something the
   * technical one cannot back, the front page is doing exactly what this
   * library refuses to let an app do.
   *
   * A machine cannot judge whether two sentences mean the same thing. What it
   * CAN do is refuse the ways that guarantee drift: a scene with only one
   * reading, and a business reading that has quietly become the longer,
   * bolder pitch. Both are caught here; the meaning is a human's job, and the
   * rule is written at the top of the SCENES array where the copy is edited.
   */
  const home = readFileSync(path.join(REPO, 'site/components/HomeClient.jsx'), 'utf8');
  const scenes = home.slice(home.indexOf('const SCENES = ['), home.indexOf('/* The code panel'));

  it('every scene carries both readings — one without the other cannot ship', () => {
    // Both quote styles: scene 03's title contains an apostrophe, so it is
    // double-quoted — a single-quote-only matcher silently counts six scenes
    // out of seven, which is how this assertion first failed.
    const numbered = [...scenes.matchAll(/n: ['"](\d\d) — /g)].map((m) => m[1]);
    const tech = [...scenes.matchAll(/\n    tech: \{/g)].length;
    const product = [...scenes.matchAll(/\n    product: \{/g)].length;

    expect(numbered.length).toBeGreaterThan(0);
    expect(tech).toBe(numbered.length);
    expect(product).toBe(numbered.length);
  });

  it('the structure is shared, so the two readings cannot become two stories', () => {
    // The scene number, the additive caption and the tone live OUTSIDE both
    // readings. If a `n:` or `add:` ever appears inside one, the readings have
    // started telling different stories rather than one story twice.
    for (const block of scenes.split(/\n  \{\n/).slice(1)) {
      const techBlock = block.slice(block.indexOf('tech: {'), block.indexOf('product: {'));
      expect(techBlock).not.toMatch(/\n\s+(n|add|tone|id):/);
    }
  });

  it('the business reading is not allowed to become the louder one', () => {
    // Not a style rule — a drift alarm. A product line that grows far past its
    // technical counterpart is usually one that stopped describing the same
    // mechanism and started selling.
    const techLen = [...scenes.matchAll(/tech: \{([\s\S]*?)\n    \},/g)]
      .reduce((n, m) => n + m[1].length, 0);
    const prodLen = [...scenes.matchAll(/product: \{([\s\S]*?)\n    \},/g)]
      .reduce((n, m) => n + m[1].length, 0);
    expect(prodLen).toBeLessThan(techLen * 1.4);
  });
});
