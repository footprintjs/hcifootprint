/**
 * Typed actuation ON THE EDGE — the Binding union's two new members and the
 * never-trap BUILD gate for the url kind.
 *
 * The gate's one law: an href must be FULLY literal, because a ':param'
 * segment can never materialise (the library never guesses params). Judged by
 * the matcher's own segment reading (segmentsOf/isParam), refused at ALL THREE
 * authoring doors — the compiler's compileTool, mount-declared tools, and the
 * fluent skillGraph().affordance() — in the builder's existing
 * SkillGraphValidationError voice.
 *
 * Mutation proofs: before this change a `url` binding was not a Binding kind
 * at all, and a paramful href sailed through both compiler doors unrefused;
 * the fluent door stayed ungated until the review fix-back below.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph, skillGraph } from '../src/index.js';
import type { Binding } from '../src/index.js';

describe('the url kind — authoring accepts literal addresses', () => {
  it('a fully-literal url binding compiles and rides the spec like any gesture', () => {
    const graph = buildNavigationGraph('shop', {
      pages: {
        home: {
          tools: {
            'open-cart': { does: 'Open the cart page', binding: { kind: 'url', href: '/cart' }, goTo: 'cart' },
          },
        },
        cart: { route: '/cart' },
      },
    });
    expect(graph.spec.affordances['home.open-cart'].binding).toEqual({ kind: 'url', href: '/cart' });
  });

  it('a tab binding compiles too — its own gesture, descriptive in v1', () => {
    const binding: Binding = { kind: 'tab', target: 'orders.history' };
    const graph = buildNavigationGraph('shop', {
      pages: { orders: { tools: { 'show-history': { does: 'Show the history tab', binding } } } },
    });
    expect(graph.spec.affordances['orders.show-history'].binding).toEqual(binding);
  });
});

describe('the never-trap BUILD gate — paramful hrefs die at authoring', () => {
  it('compileTool refuses a :param segment loudly, in the builder voice', () => {
    expect(() =>
      buildNavigationGraph('shop', {
        pages: {
          home: {
            tools: {
              'open-order': { does: 'Open one order', binding: { kind: 'url', href: '/orders/:id' } },
            },
          },
        },
      }),
    ).toThrow(/tool 'home\.open-order' declares a url binding with href '\/orders\/:id' — a ':param' segment can never materialise/);
  });

  it("a skill whose ENTRY step declares such a url is unconstructable — the entry dies at the tool's own door", () => {
    // The gate's second clause is structural: every static tool passes
    // compileTool, so the paramful entry step never exists to be stepped on.
    expect(() =>
      buildNavigationGraph('shop', {
        pages: {
          home: {
            tools: {
              'open-order': { does: 'Open one order', binding: { kind: 'url', href: '/orders/:id' } },
            },
          },
        },
        skills: { review: { does: 'Review an order', steps: ['open-order'] } },
      }),
    ).toThrow(/':param' segment can never materialise/);
  });

  it('the mount door enforces the same law with the same words', () => {
    const graph = buildNavigationGraph('shop', { pages: { home: {} } });
    const session = graph.createSession({ node: 'home' });
    expect(() =>
      session.registerToolGroup('home', {
        tools: { 'open-order': { does: 'Open one order', binding: { kind: 'url', href: '/orders/:id' } } },
      }),
    ).toThrow(/mount-declared tool 'home\.open-order' declares a url binding with href '\/orders\/:id'/);
  });

  it('the fluent door enforces the same law with the same words', () => {
    // MUTATION PROOF: before this fix skillGraph().affordance() copied the
    // binding unchecked — the same input the other two doors refuse loudly
    // BUILT silently, handing the fluent-door author a permanently-dead edge
    // (runtime honesty held, but the promised build error never came).
    expect(() =>
      skillGraph('shop')
        .page('home')
        .affordance('open-order', {
          on: 'home',
          description: 'Open one order',
          binding: { kind: 'url', href: '/orders/:id' },
        })
        .build(),
    ).toThrow(/affordance 'open-order' declares a url binding with href '\/orders\/:id' — a ':param' segment can never materialise/);
  });

  it('a non-string href from a JS caller fails closed in the library voice, not a downstream TypeError', () => {
    expect(() =>
      buildNavigationGraph('shop', {
        pages: {
          home: {
            tools: {
              broken: { does: 'Broken', binding: { kind: 'url', href: 42 as unknown as string } },
            },
          },
        },
      }),
    ).toThrow(/url binding whose href is not a string \(got number\)/);
  });
});
