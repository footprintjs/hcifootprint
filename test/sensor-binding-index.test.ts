/**
 * binding-index.ts — the manifest, DERIVED from the graph and never configured.
 *
 * Two properties are load-bearing and both are asserted here rather than argued:
 * ONE COVERAGE ROW PER SERVED EDGE (so the count a consumer reads back is the
 * count the graph declared, and an edge can never go missing between the two), and
 * the three walls kept apart, because "I cannot see this gesture", "only you can
 * declare this value" and "you already report this yourself" have three different
 * fixes.
 *
 * Mutation proof: binding-index.ts did not exist before this change, so every test
 * here fails against pre-change source.
 */
import { describe, expect, it } from 'vitest';
import type { AvailableEdge } from '../src/index.js';
import { buildBindingIndex, momentKey, nameKey } from '../src/sensor/binding-index.js';
import type { IndexInputs } from '../src/sensor/binding-index.js';
import { createControlIndex } from '../src/sensor/control-index.js';
import { desk, el, mountDesk } from './sensor-fixture.js';

function inputs(edges: readonly AvailableEdge[], overrides: Partial<IndexInputs> = {}): IndexInputs {
  return {
    edges,
    standsDown: () => false,
    declarations: createControlIndex(),
    cadence: 'commit',
    canDebounce: true,
    ...overrides,
  };
}

/** The desk's real served edges — the manifest is only worth testing against real ones. */
function deskEdges(): readonly AvailableEdge[] {
  return mountDesk().session.available().edges;
}

function rowFor(edges: readonly AvailableEdge[], edge: string, overrides: Partial<IndexInputs> = {}) {
  return buildBindingIndex(inputs(edges, overrides)).coverage.find((row) => row.edge === edge);
}

describe('one coverage row per served edge, always', () => {
  it('the row count equals the edge count', () => {
    const edges = deskEdges();
    const index = buildBindingIndex(inputs(edges));
    expect(index.coverage).toHaveLength(edges.length);
    expect(index.coverage.map((r) => r.edge).sort()).toEqual(edges.map((e) => e.affordanceId).sort());
  });

  it('an empty surface is an empty manifest, not an error', () => {
    const index = buildBindingIndex(inputs([]));
    expect(index.coverage).toEqual([]);
    expect(index.eventTypes).toEqual([]);
    expect(index.recognised).toEqual([]);
  });
});

describe('what IS watched, and the moment each one commits on', () => {
  it('a clicked button is watched on click', () => {
    const index = buildBindingIndex(inputs(deskEdges()));
    const send = index.recognised.find((r) => r.edge === desk.send);
    expect(send).toMatchObject({ role: 'button', name: 'Send', actuation: 'click', eventType: 'click' });
  });

  it('a pressed button is watched on keydown', () => {
    const index = buildBindingIndex(inputs(deskEdges()));
    expect(index.recognised.find((r) => r.edge === desk.undo)?.eventType).toBe('keydown');
  });

  it('only the event classes the live list needs are asked for', () => {
    const index = buildBindingIndex(inputs(deskEdges()));
    // click (send/archive/save/save-draft/reply) and keydown (undo). No 'input':
    // the value controls are payload-blocked, and no 'change' either for the same
    // reason — a listener with nothing to recognise is a listener not registered.
    expect([...index.eventTypes].sort()).toEqual(['click', 'keydown']);
  });

  it('an edge on a repeats container carries its live instance keys, copied out of the spec', () => {
    const edges = mountDesk({ state: { threadIds: ['t-1', 't-2'] } }).session.available().edges;
    const reply = buildBindingIndex(inputs(edges)).recognised.find((r) => r.edge === desk.reply);
    expect(reply?.instances).toEqual(['t-1', 't-2']);
    // A fresh array: the index can never be the thing that mutates available()'s answer.
    expect(reply?.instances).not.toBe(edges.find((e) => e.affordanceId === desk.reply)?.instances);
  });

  it('an authored name is normalised through the SAME function the computed one uses', () => {
    const edges: AvailableEdge[] = [
      {
        affordanceId: 'x.y',
        description: 'd',
        role: 'action',
        evidence: [],
        binding: { kind: 'element', locator: { role: 'button', name: 'Clear\n   archive' }, actuation: 'click' },
      } as unknown as AvailableEdge,
    ];
    expect(buildBindingIndex(inputs(edges)).recognised[0]?.name).toBe('Clear archive');
  });
});

describe("the 'gesture' wall — no moment the sensor can recognise", () => {
  it('a pointer gesture', () => {
    expect(rowFor(deskEdges(), desk.preview)).toMatchObject({
      status: 'unwatched',
      blocked: 'gesture',
      reason: expect.stringContaining("does not watch 'hover'"),
    });
  });

  it('a url hop belongs to sync(), not to an edge fire', () => {
    expect(rowFor(deskEdges(), desk.help)).toMatchObject({
      status: 'unwatched',
      blocked: 'gesture',
      reason: expect.stringContaining('sync()'),
    });
  });

  it('no binding at all — and the sentence names the way out', () => {
    expect(rowFor(deskEdges(), desk.refresh)).toMatchObject({
      status: 'unwatched',
      blocked: 'gesture',
      reason: expect.stringContaining('attach()'),
    });
  });

  it('the other three binding kinds each get their own sentence', () => {
    const kinds = [
      { binding: { kind: 'keychord', chord: 'mod+k' }, says: 'chord grammar' },
      { binding: { kind: 'programmatic', provider: 'canvas' }, says: 'publishes its own affordance' },
      { binding: { kind: 'tab', target: 'a.b' }, says: 'visibility wire' },
      { binding: { kind: 'element', locator: { role: 'button', name: 'X' } }, says: "add actuation: 'click'" },
    ] as const;
    for (const { binding, says } of kinds) {
      const edges = [
        { affordanceId: 'x.y', description: 'd', role: 'action', evidence: [], binding } as unknown as AvailableEdge,
      ];
      expect(rowFor(edges, 'x.y')?.reason).toContain(says);
    }
  });
});

describe("the 'payload' wall — only the app can declare a value", () => {
  it('an action with a real schema is honestly unwatched under RECOGNISED', () => {
    expect(rowFor(deskEdges(), desk.compose)).toMatchObject({
      status: 'unwatched',
      blocked: 'payload',
      reason: expect.stringContaining('never reads one off the DOM'),
    });
  });

  it("an action declared 'none' is watched — there is no contract to satisfy", () => {
    expect(rowFor(deskEdges(), desk.send)).toEqual({ edge: desk.send, status: 'watching' });
  });

  it('an action with NO declared contract is watched too — absence is not a value demand', () => {
    expect(rowFor(deskEdges(), desk.archive)).toEqual({ edge: desk.archive, status: 'watching' });
  });

  it('a DECLARED control with a value getter opens the same edge', () => {
    const declarations = createControlIndex();
    declarations.attach({ edge: desk.compose, element: el('input'), value: () => ({ message: 'hi' }) });
    expect(rowFor(deskEdges(), desk.compose, { declarations })).toEqual({
      edge: desk.compose,
      status: 'watching',
    });
  });

  it('a DECLARED control WITHOUT one is blocked, and the sentence names the getter', () => {
    const declarations = createControlIndex();
    declarations.attach({ edge: desk.compose, element: el('input') });
    expect(rowFor(deskEdges(), desk.compose, { declarations })).toMatchObject({
      blocked: 'payload',
      reason: expect.stringContaining('value: () => yourState'),
    });
  });

  it('a declaration also opens an edge the sensor could never RECOGNISE at all', () => {
    const declarations = createControlIndex();
    declarations.attach({ edge: desk.refresh, element: el('button') });
    expect(rowFor(deskEdges(), desk.refresh, { declarations })).toEqual({
      edge: desk.refresh,
      status: 'watching',
    });
  });
});

describe("the 'door' wall — it outranks every other reason", () => {
  it('an excluded edge stands down and says so', () => {
    expect(rowFor(deskEdges(), desk.send, { standsDown: (e) => e === desk.send })).toMatchObject({
      status: 'unwatched',
      blocked: 'door',
      reason: expect.stringContaining('one act writes one row'),
    });
  });

  it('it applies to a DECLARED control too — one exclusion surface, not two', () => {
    const declarations = createControlIndex();
    declarations.attach({ edge: desk.compose, element: el('input'), value: () => ({ message: 'hi' }) });
    expect(
      rowFor(deskEdges(), desk.compose, { declarations, standsDown: (e) => e === desk.compose }),
    ).toMatchObject({ blocked: 'door' });
  });

  it('an excluded edge contributes no recognition entry at all', () => {
    const index = buildBindingIndex(inputs(deskEdges(), { standsDown: (e) => e === desk.send }));
    expect(index.recognised.some((r) => r.edge === desk.send)).toBe(false);
  });
});

describe('declaredNames — every element-bound control, watched or not', () => {
  it('includes an edge the sensor is NOT watching, so its control can be silenced', () => {
    const index = buildBindingIndex(inputs(deskEdges()));
    // compose is payload-blocked and preview is gesture-blocked; both must still be
    // recognisable AS controls, or a click on them would read as off-graph noise.
    expect(index.declaredNames.has(nameKey('textbox', 'Message'))).toBe(true);
    expect(index.declaredNames.has(nameKey('button', 'Preview'))).toBe(true);
  });

  it('excludes a control the graph never bound to an element', () => {
    const index = buildBindingIndex(inputs(deskEdges()));
    expect(index.declaredNames.has(nameKey('button', 'Refresh'))).toBe(false);
  });
});

describe('the keys cannot be made to collide', () => {
  it('two different (role, name) pairs never share a moment key', () => {
    expect(momentKey('click', 'button', 'a b')).not.toBe(momentKey('click', 'button a', 'b'));
    expect(nameKey('button', 'a b')).not.toBe(nameKey('button a', 'b'));
  });

  it('the same pair under two moments are two keys', () => {
    expect(momentKey('click', 'button', 'Send')).not.toBe(momentKey('keydown', 'button', 'Send'));
  });
});

describe('two edges claiming one locator both land in the same bucket', () => {
  it('so recognition can see the ambiguity rather than the first hit', () => {
    const index = buildBindingIndex(inputs(deskEdges()));
    const bucket = index.byMoment.get(momentKey('click', 'button', 'Save'));
    expect(bucket?.map((entry) => entry.edge).sort()).toEqual([desk.save, desk.saveDraft].sort());
  });
});
