/**
 * Two controls, one address.
 *
 * An element binding is a (role, name) pair — the same pair an agent reads out
 * of the accessibility tree and a screen reader announces. Two affordances on
 * one page bound to the same pair is a FOLD: the sensor keys them identically
 * and whichever resolves first wins, silently and possibly differently between
 * renders. Two "Delete" buttons on one screen is not exotic.
 *
 * Tested both ways. A check that cannot fire is decoration, and one that fires
 * on an ordinary graph is noise.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph } from '../src/index.js';
import { lintGraph } from '../src/testing/model/lint.js';

const el = (role: string, name: string) => ({ kind: 'element', locator: { role, name } });

const ambiguous = (g: ReturnType<typeof buildNavigationGraph>) =>
  lintGraph(g).filter((f) => f.code === 'ambiguous-binding');

describe('ambiguous-binding', () => {
  it('says nothing when every control on a page is distinctly named', () => {
    const g = buildNavigationGraph('clean', {
      pages: {
        list: {
          actions: {
            'delete-draft': { does: 'Delete the draft', binding: el('button', 'Delete draft') },
            'delete-post': { does: 'Delete the post', binding: el('button', 'Delete post') },
          },
        },
      },
    } as never);
    expect(ambiguous(g)).toEqual([]);
  });

  it('refuses two actions that bind to the same role and name on one page', () => {
    const g = buildNavigationGraph('collide', {
      pages: {
        list: {
          actions: {
            'delete-draft': { does: 'Delete the draft', binding: el('button', 'Delete') },
            'delete-post': { does: 'Delete the post', binding: el('button', 'Delete') },
          },
        },
      },
    } as never);
    const found = ambiguous(g);
    expect(found).toHaveLength(1);
    expect(found[0]!.severity).toBe('error');
    expect(found[0]!.message).toContain('delete-draft');
    expect(found[0]!.message).toContain('delete-post');
  });

  it('treats names differing only in case or padding as the same address', () => {
    // A screen reader announces both identically; so does an agent. Letting the
    // check pass on a difference nobody can perceive would be a fold of its own.
    const g = buildNavigationGraph('casey', {
      pages: {
        list: {
          actions: {
            a: { does: 'A', binding: el('button', 'Delete') },
            b: { does: 'B', binding: el('button', '  delete ') },
          },
        },
      },
    } as never);
    expect(ambiguous(g)).toHaveLength(1);
  });

  it('same name on DIFFERENT pages is fine — a page is the scope', () => {
    const g = buildNavigationGraph('scoped', {
      pages: {
        one: { actions: { a: { does: 'A', binding: el('button', 'Delete') } } },
        two: { actions: { b: { does: 'B', binding: el('button', 'Delete') } } },
      },
    } as never);
    expect(ambiguous(g)).toEqual([]);
  });
});
