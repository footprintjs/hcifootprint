/**
 * Undefined semantics — the null-dress regression (pilot run 2026-07-14).
 *
 * Field incident, replayed from a live episode: a model passed the wrong
 * payload key, the handler destructured undefined and reported
 * `{selectedDressId: undefined}`, the session STORED the undefined (an
 * existing key stored it while a new key was dropped — inconsistent), and
 * the guard `selectedDressId ne ''` MATCHED undefined — so "add to cart"
 * was offered with full evidence while no dress was selected, and the shop
 * sold a cart containing [null].
 *
 * The two rules pinned here:
 * 1. updateState drops undefined-valued entries uniformly (new AND existing
 *    keys, every attribution path). A declared write reported as undefined
 *    is a MISSING write — effectVerified flips false.
 * 2. A state key holding undefined is UNEVALUABLE for guards — served with
 *    the guardUnevaluated honesty marker, never evaluated (an `ne` operator
 *    would match undefined and invert the author's intent).
 */
import { describe, expect, it } from 'vitest';
import { skillGraph } from '../src/index.js';
import type { SkillGraph } from '../src/index.js';

function shop(): SkillGraph {
  return skillGraph('undef', { description: 'undefined-semantics fixture' })
    .page('p', { route: '/' })
    .affordance('select', {
      on: 'p',
      description: 'Open one item',
      binding: { kind: 'programmatic', provider: 'x' },
      effect: { writes: ['sel'] },
    })
    .affordance('buy', {
      on: 'p',
      description: 'Buy the open item',
      binding: { kind: 'programmatic', provider: 'x' },
      guard: { sel: { ne: '' } },
      effect: { writes: ['cart'] },
    })
    .build();
}

describe('updateState drops undefined uniformly (rule 1)', () => {
  it('existing key keeps its old value on every attribution path', () => {
    const s = shop().createSession({ node: 'p', state: { sel: '' } });

    // Stimulus path.
    s.updateState({ sel: undefined }, { stimulus: 'push' });
    expect(s.state()['sel']).toBe('');

    // Settlement path (the incident's path): handler reports undefined.
    s.registerTools({ group: 'g', tools: { select: () => {} } });
    const fired = s.fire('select', { source: 'agent' });
    expect(fired.ok).toBe(true);
    const settled = s.updateState({ sel: undefined });
    expect(settled.ok).toBe(true);
    expect(s.state()['sel']).toBe(''); // old value retained, undefined never stored
  });

  it('new keys with undefined never appear, and never count as state motion', () => {
    const s = shop().createSession({ node: 'p', state: {} });
    const stateVersionBefore = s.stateVersion;
    s.updateState({ ghost: undefined }, { stimulus: 'push' });
    expect('ghost' in s.state()).toBe(false);
    expect(s.stateVersion).toBe(stateVersionBefore); // empty-after-drop = cursor stop, not motion
  });

  it('a declared write reported as undefined is a MISSING write — effectVerified false', async () => {
    const s = shop().createSession({ node: 'p', state: { sel: '' } });
    s.registerTools({ group: 'g', tools: { select: () => {} } });
    const fired = s.fire('select', { source: 'agent' });
    if (!fired.ok) throw new Error('fire refused');
    await new Promise((resolve) => setTimeout(resolve, 0)); // let the handler complete
    const settled = s.updateState({ sel: undefined });
    if (!settled.ok) throw new Error('settle refused');
    expect(settled.transition.outcome).toBe('committed');
    expect(settled.transition.id).toBe(fired.transition.id); // settles the FIRE, not a stimulus
    // Pre-fix this was TRUE — an undefined-valued write counted as covering
    // the declared key. Now the dropped entry is honestly a missing write.
    expect(settled.transition.effectVerified).toBe(false);
  });
});

describe('guards treat undefined as unevaluable (rule 2)', () => {
  it('an undefined-valued key serves the edge WITH guardUnevaluated — never ne-true', () => {
    // Undefined can still enter via the author's initial state.
    const s = shop().createSession({ node: 'p', state: { sel: undefined } });
    const edge = s.available().edges.find((e) => e.affordanceId === 'buy');
    expect(edge).toBeDefined();
    expect(edge!.guardUnevaluated).toEqual(['sel']); // honesty marker, not silent pass
    expect(edge!.evidence).toEqual([]); // no fabricated `ne` evidence over undefined
    expect(s.explain('buy').guardUnevaluated).toEqual(['sel']);
  });

  it('fire on such an edge records the honesty marker on the transition', () => {
    const s = shop().createSession({ node: 'p', state: { sel: undefined } });
    s.registerTools({ group: 'g', tools: { buy: () => {} } });
    const fired = s.fire('buy', { source: 'agent' });
    if (!fired.ok) throw new Error('fire refused');
    expect(fired.transition.guardUnevaluated).toEqual(['sel']);
  });
});

describe('the null-dress regression, end to end', () => {
  it('wrong payload key can no longer walk a null item past a value guard', () => {
    const s = shop().createSession({ node: 'p', state: { sel: '', cart: [] as string[] } });
    let selected: string | undefined;
    s.registerTools({
      group: 'g',
      tools: {
        // The incident's handler shape: destructures a key the caller never sent.
        select: (payload?: unknown) => {
          const { itemId } = (payload ?? {}) as { itemId?: string };
          selected = itemId;
          s.updateState({ sel: itemId });
        },
        buy: () => s.updateState({ cart: [selected] }),
      },
    });

    // The agent passes the WRONG key — exactly the live episode.
    const opened = s.fire('select', { source: 'agent', payload: { id: 'd3' } });
    expect(opened.ok).toBe(true); // v0 ships no JSON-Schema validator (documented)
    expect(s.state()['sel']).toBe(''); // undefined report dropped — old value retained

    // Before the fix: guard `sel ne ''` matched the stored undefined and the
    // shop sold [null]. Now: '' fails the guard and the fire is REFUSED.
    expect(s.available().edges.map((e) => e.affordanceId)).not.toContain('buy');
    const bought = s.fire('buy', { source: 'agent' });
    expect(bought.ok).toBe(false);
    if (bought.ok) throw new Error('unreachable');
    expect(bought.reason).toBe('GUARD_FAILED');
    expect(s.state()['cart']).toEqual([]); // no null item, ever
  });
});
