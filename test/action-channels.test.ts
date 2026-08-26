import { describe, expect, it } from 'vitest';
import { createActionRuntime, declareKinds } from '../src/index.js';

/**
 * CHANNELS — surfaces declare what they can serve, matching is by kind, and
 * a miss is a RECORDED fact: the degradation record is the backlog written
 * by actual usage, not a fallback apology.
 */

describe('surface declarations — one id, one live surface, kinds governed', () => {
  it('declares, matches by kind, and retires idempotently without touching a successor', () => {
    const runtime = createActionRuntime({
      kinds: declareKinds({ array: {}, 'analysis.summary': {} }),
    });
    const monitor = runtime.declareSurface({
      surface: 'monitor.arrays',
      node: 'monitor',
      collects: ['array'],
      shows: ['array', 'analysis.summary'],
    });

    expect(
      runtime.surfacesFor({ collects: 'array' }).map((s) => s.surface),
    ).toEqual(['monitor.arrays']);
    expect(
      runtime.surfacesFor({ shows: 'analysis.summary' }).map((s) => s.surface),
    ).toEqual(['monitor.arrays']);

    // One id, one live surface — a duplicate is a refusal, never a shadow.
    expect(() =>
      runtime.declareSurface({ surface: 'monitor.arrays', node: 'elsewhere' }),
    ).toThrow(/already declared and live/);

    expect(monitor.retire()).toBe(true);
    expect(monitor.retire()).toBe(false);
    // A stale retire must never take down a successor under the same id.
    const successor = runtime.declareSurface({
      surface: 'monitor.arrays',
      node: 'monitor-v2',
      collects: ['array'],
    });
    expect(monitor.retire()).toBe(false);
    expect(
      runtime.surfacesFor({ collects: 'array' }).map((s) => s.node),
    ).toEqual(['monitor-v2']);
    successor.retire();
  });

  it('a surface naming an ungoverned kind is refused in the same vocabulary as a definition', () => {
    const runtime = createActionRuntime({
      kinds: declareKinds({ array: {} }),
    });
    expect(() =>
      runtime.declareSurface({
        surface: 'monitor.bad',
        node: 'monitor',
        collects: ['arary'],
      }),
    ).toThrow(/surface 'monitor.bad' collects kind 'arary', which the mounted catalog does not govern/);
  });
});

describe('the degradation record — a miss is a counted fact', () => {
  it('records who was needed and how often, and stops counting once a surface exists', () => {
    const runtime = createActionRuntime({
      kinds: declareKinds({ array: {}, 'analysis.summary': {} }),
    });

    expect(runtime.surfacesFor({ shows: 'analysis.summary' })).toEqual([]);
    expect(runtime.surfacesFor({ shows: 'analysis.summary' })).toEqual([]);
    expect(runtime.surfacesFor({ collects: 'array' })).toEqual([]);

    // Counted, because asked-once and asked-forty-times-a-day are different
    // priorities wearing the same row.
    expect(runtime.channelGaps()).toEqual([
      { kind: 'analysis.summary', channel: 'shows', asks: 2 },
      { kind: 'array', channel: 'collects', asks: 1 },
    ]);

    // A surface arriving answers the need — the gap stops growing, but the
    // history of having been needed is not erased.
    runtime.declareSurface({
      surface: 'report.panel',
      node: 'report',
      shows: ['analysis.summary'],
    });
    expect(runtime.surfacesFor({ shows: 'analysis.summary' })).toHaveLength(1);
    expect(
      runtime.channelGaps().find((gap) => gap.kind === 'analysis.summary')!
        .asks,
    ).toBe(2);
  });

  it('a query for an unknown kind under a mounted catalog is a refusal, not a gap — else the record fills with typos', () => {
    const runtime = createActionRuntime({
      kinds: declareKinds({ array: {} }),
    });
    expect(() => runtime.surfacesFor({ collects: 'arary' })).toThrow(
      /does not govern/,
    );
    expect(runtime.channelGaps()).toEqual([]);
  });

  it('with no catalog mounted, queries flow and the kinds surface in the governance report', () => {
    const runtime = createActionRuntime();
    expect(runtime.surfacesFor({ shows: 'analysis.summary' })).toEqual([]);
    expect(runtime.channelGaps()).toEqual([
      { kind: 'analysis.summary', channel: 'shows', asks: 1 },
    ]);
    const report = runtime.kindGovernance();
    expect(report.mounted).toBe(false);
    expect(report.ungoverned).toContain('analysis.summary');
  });
});
