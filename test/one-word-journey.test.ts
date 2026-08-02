/**
 * THE ONE WORD — "journey" for a named flow, "action" for what an app authors,
 * and "tool" reserved for what is SERVED to a model.
 *
 * At 1.0 the old vocabulary is DELETED, not aliased, so this file pins three
 * things a reader can act on:
 *
 * 1. The definition keys are `actions:` and `journeys:`. The renamed spellings
 *    are REFUSED by name — an authored sentence that says which key to write —
 *    rather than read as "nothing declared here". Mutation: make the reader fall
 *    back to the old key and the refusal tests fail; make it ignore the old key
 *    silently and the "never a silently empty graph" tests fail.
 *
 * 2. The journey vocabulary is what a Session answers in: `availableJourneys`,
 *    `journeyPlan`, `commitJourney`, `journeyFrame`, `leaveJourney`, and the
 *    `UNKNOWN_JOURNEY` refusal — down to the field names on what they return.
 *
 * 3. "Tool" did not move where it belongs: `toMCPTools`, `edgesToMCPTools` and
 *    `leaveJourneyTool` serve MCP TOOLS, and that word is correct there.
 *
 * The refusals are compared against the EXPORTED constants, so no runtime value
 * can drift into one unnoticed. The type-level half — every deleted name proved
 * gone — lives in one-word-journey.test-d.ts.
 */
import { describe, expect, it } from 'vitest';
import {
  ActionRegistry,
  GraphValidationError,
  InteractionSession,
  buildNavigationGraph,
  edgesToMCPTools,
  fromJourneys,
  serveToAgent,
  leaveJourneyTool,
} from '../src/index.js';
import type { NavigationGraphDef } from '../src/index.js';
import {
  SKILLS_KEY_RENAMED,
  TOOLS_KEY_RENAMED,
  actionsOf,
  hasJourneysKey,
  journeysOf,
} from '../src/tree/authoring-keys.js';

/** The storefront, in the words this library keeps. */
const WORDS = {
  pages: {
    catalog: {
      actions: { 'add-to-cart': { does: 'Add the dress to the cart', writes: ['cart'] } },
      areas: { rail: { actions: { 'set-color': { does: 'Filter by colour' } } } },
    },
    checkout: { route: '/checkout', actions: { pay: { does: 'Pay', confirm: true } } },
  },
  actions: { help: { does: 'Open help', on: ['catalog', 'checkout'] } },
  journeys: { purchase: { does: 'Buy a dress end to end', steps: ['add-to-cart', 'pay'] } },
} satisfies NavigationGraphDef;

/** A definition in the old words, as plain data — the shape the types now refuse. */
const oldWords = (def: unknown): NavigationGraphDef => def as NavigationGraphDef;

describe('the definition keys are `actions:` and `journeys:`', () => {
  it('compiles a definition written in those two words', () => {
    const graph = buildNavigationGraph('shop', WORDS);

    expect(Object.keys(graph.spec.affordances).sort()).toEqual([
      'catalog.add-to-cart',
      'catalog.rail.set-color',
      'checkout.pay',
      'help',
    ]);
    expect(graph.spec.journeys.purchase.steps).toEqual(['catalog.add-to-cart', 'checkout.pay']);
    expect(graph.spec.affordances['checkout.pay'].highEffect).toBe(true);
  });

  it('files the compiled journeys under the same word the definition used', () => {
    const graph = buildNavigationGraph('shop', WORDS);
    expect(Object.keys(graph.spec.journeys)).toEqual(['purchase']);
    expect(graph.spec).not.toHaveProperty('skills');
  });

  it('DECLARING NEITHER IS NOT AN ERROR — nothing there is answered with absence', () => {
    // The two readers are the only door onto these keys, and every caller reaches
    // them with something that may legitimately have declared nothing: an empty
    // page, a source that contributed no definition. "Nothing declared" has to
    // come back as absence, or the gradient floor — a page you can name before
    // you have wired anything to it — stops compiling.
    expect(actionsOf(undefined)).toBeUndefined();
    expect(journeysOf(undefined)).toBeUndefined();
    expect(hasJourneysKey(undefined)).toBe(false);
    expect(actionsOf({})).toBeUndefined();
    expect(journeysOf({})).toBeUndefined();
    expect(hasJourneysKey({})).toBe(false);
    // …and the presence question is about the KEY, not about its contents: an
    // author who wrote `journeys: {}` said something, and the merge preserves it.
    expect(hasJourneysKey({ journeys: {} })).toBe(true);
  });
});

describe('the renamed keys are refused by name — never read as an empty graph', () => {
  it('refuses `tools:` on a node, naming `actions:` as the key to write', () => {
    const build = (): unknown =>
      buildNavigationGraph(
        'shop',
        oldWords({ pages: { catalog: { tools: { 'add-to-cart': { does: 'Add' } } } } }),
      );

    expect(build).toThrow(GraphValidationError);
    expect(build).toThrow(TOOLS_KEY_RENAMED);
    // The correction is the whole point: it names the new key, and it says why
    // the old word was taken away rather than only that it was.
    expect(TOOLS_KEY_RENAMED).toContain('`actions:`');
    expect(TOOLS_KEY_RENAMED).toContain('SERVED to a model');
  });

  it('refuses `tools:` at the root of a definition too', () => {
    expect(() =>
      buildNavigationGraph(
        'shop',
        oldWords({ pages: { catalog: {} }, tools: { help: { does: 'Help', on: 'catalog' } } }),
      ),
    ).toThrow(TOOLS_KEY_RENAMED);
  });

  it('refuses `skills:`, naming `journeys:` as the key to write', () => {
    const build = (): unknown =>
      buildNavigationGraph(
        'shop',
        oldWords({
          pages: { catalog: { actions: { 'add-to-cart': { does: 'Add' } } } },
          skills: { purchase: { does: 'Buy it', steps: ['add-to-cart'] } },
        }),
      );

    expect(build).toThrow(GraphValidationError);
    expect(build).toThrow(SKILLS_KEY_RENAMED);
    expect(SKILLS_KEY_RENAMED).toContain('`journeys:`');
  });

  it('refuses the renamed key at MOUNT time in the same words', () => {
    const session = buildNavigationGraph('mount', { pages: { home: {} } }).createSession({ node: 'home' });
    expect(() =>
      session.registerActions('home', {
        ...(oldWords({ tools: { wave: { does: 'Wave', handler: () => undefined } } }) as object),
      }),
    ).toThrow(TOOLS_KEY_RENAMED);
  });

  it('refuses the renamed key through the source merge too', () => {
    expect(() =>
      buildNavigationGraph(
        'sourced',
        oldWords({
          pages: { catalog: { actions: { 'add-to-cart': { does: 'Add' } } } },
          sources: [fromJourneys({ purchase: { does: 'Buy it', steps: ['add-to-cart'] } })],
          skills: { browse: { does: 'Look around', steps: ['add-to-cart'] } },
        }),
      ),
    ).toThrow(SKILLS_KEY_RENAMED);
  });

  it('carries NO runtime text into the refusal — the sentence is an authored constant', () => {
    const build = (): unknown =>
      buildNavigationGraph(
        'a-graph-id-nobody-should-see',
        oldWords({ pages: { 'a-page-nobody-should-see': { tools: { 'an-action': { does: 'x' } } } } }),
      );
    expect(build).toThrow(TOOLS_KEY_RENAMED);
    try {
      build();
    } catch (error) {
      const message = (error as Error).message;
      expect(message).not.toContain('a-graph-id-nobody-should-see');
      expect(message).not.toContain('a-page-nobody-should-see');
      expect(message).not.toContain('an-action');
    }
  });
});

describe('a Session answers in the journey vocabulary', () => {
  const graph = (): ReturnType<typeof buildNavigationGraph> => buildNavigationGraph('shop', WORDS);

  it('serves journeys, plans them, commits and leaves them', () => {
    const session = graph().createSession({ node: 'catalog' });
    session.registerActions('catalog', { handlers: { 'add-to-cart': () => undefined } });

    expect(session.availableJourneys().journeys.map((j) => j.id)).toEqual(['purchase']);
    expect(session.journeyPlan('purchase').journeyId).toBe('purchase');
    expect(session.journeyPlan('purchase').steps.map((s) => s.affordanceId)).toEqual([
      'catalog.add-to-cart',
      'checkout.pay',
    ]);

    const committed = session.commitJourney('purchase', { source: 'user' });
    expect(committed.ok).toBe(true);
    expect(session.journeyFrame()?.journeyId).toBe('purchase');
    expect(session.leaveJourney({ reason: 'cancelled' })?.status).toBe('cancelled');
  });

  it('refuses an unknown id as UNKNOWN_JOURNEY, from both doors, in one shape', () => {
    const session = graph().createSession({ node: 'catalog' });
    expect(session.tryJourneyPlan('nope')).toEqual({
      ok: false,
      reason: 'UNKNOWN_JOURNEY',
      known: ['purchase'],
    });
    expect(session.commitJourney('nope', { source: 'user' })).toEqual({
      ok: false,
      reason: 'UNKNOWN_JOURNEY',
      known: ['purchase'],
    });
  });

  it('files a refused commit under `journeyId` in the gap ledger', () => {
    const session = graph().createSession({ node: 'catalog' });
    // Nothing is wired, so an AGENT commit hits the never-trap gate and the row
    // it lands names the journey the planner asked for.
    expect(session.commitJourney('purchase', { source: 'agent' }).ok).toBe(false);
    expect(session.gaps().at(-1)?.journeyId).toBe('purchase');
    expect(session.gaps().at(-1)?.availableJourneys).toEqual(['purchase']);
  });
});

describe('"tool" still means what is SERVED to a model', () => {
  it('keeps the word in the MCP emitters', () => {
    const graph = buildNavigationGraph('shop', WORDS);
    const session = graph.createSession({ node: 'catalog' });

    const tools = edgesToMCPTools(graph.spec, session.available().edges);
    expect(tools.map((t) => t.name)).toContain('shop.catalog.add-to-cart');
    expect(session.toMCPTools().map((t) => t.name)).toContain('shop.catalog.add-to-cart');
  });

  it('serves the escape tool as `leave-journey` — one word on the wire too', () => {
    const graph = buildNavigationGraph('shop', WORDS);
    const escape = leaveJourneyTool(graph.spec, 'purchase');
    expect(escape.name).toBe('shop.leave-journey');
    expect(escape.description).toContain('Leave the current journey (purchase)');
  });

  it('names one served tool per journey in Mode B', () => {
    const session = buildNavigationGraph('shop', WORDS).createSession({ node: 'catalog' });
    const names = serveToAgent(session)
      .tools()
      .map((t) => t.name);
    expect(names).toContain('shop.journey.purchase');
    expect(names).not.toContain('shop.skill.purchase');
  });

  it('registers ACTIONS through the doors that bind them', () => {
    const session = buildNavigationGraph('shop', WORDS).createSession({ node: 'catalog' });
    const handle = session.registerAction('catalog', 'add-to-cart', {
      does: 'Add',
      handler: () => undefined,
    });
    expect(handle.actionId).toBe('add-to-cart');
    expect(session).toBeInstanceOf(InteractionSession);
    expect(new ActionRegistry()).toBeInstanceOf(ActionRegistry);
    // LiveBindingPort's member is `registerActions` — the one mount door.
    expect(typeof session.registerActions).toBe('function');
  });
});
