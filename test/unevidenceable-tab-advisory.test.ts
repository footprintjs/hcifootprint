/**
 * The advisory has to fire on the shape it is about, and stay quiet on the rest.
 *
 * The shape: a page that authors its controls BESIDE its tabs, leaving the tabs
 * as labels no declared control can ever put the cursor inside. Such a page
 * tracks presence and never position — "You are on" stops at the page while the
 * reader is somewhere the map can name and does not.
 *
 * What the static check can prove is only that half. The CURE is a runtime call
 * — `session.sync('page.tab')`, or a mount that declares the tab's controls when
 * the panel renders — and no reading of the compiled graph can see either. That
 * is why this is a note and not an error, and why the message says so instead of
 * nagging.
 *
 * The floor is the whole design (the waypoint advisory's lesson): an advisory
 * that fires on an ordinary graph is one people learn to scroll past. Three
 * ordinary graphs are asserted silent here, and the third — a page that authors
 * nothing because its whole action surface arrives from a live store — is the
 * repo's own live-desk demo shape.
 *
 * MUTATION PROOFS: drop the `holdsAnAction(node.page)` floor and the live-store
 * case fires; drop the `tabTargets` check and the tab-switch case fires; drop
 * the subtree check and the ordinary nested graph fires; make the severity
 * 'warning' and checkGraph stops calling the smell graph healthy.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph } from '../src/index.js';
import { lintGraph } from '../src/testing/model/lint.js';
import { checkGraph } from '../src/testing/model/check.js';

const tabFindings = (g: ReturnType<typeof buildNavigationGraph>) =>
  lintGraph(g).filter((f) => f.code === 'unevidenceable-tab');

/** Controls declared at page level; the tabs are labels. */
const labelTabs = () =>
  buildNavigationGraph('runs', {
    pages: {
      'run-detail': {
        actions: { export: { does: 'Export this run as JSON', writes: ['run.exported'] } },
        tabs: { why: { does: 'Why this step ran' }, timeline: { does: 'The run timeline' } },
      },
    },
  } as never);

describe('unevidenceable-tab advisory', () => {
  it('fires on tabs no declared control can put the cursor inside', () => {
    const found = tabFindings(labelTabs());

    expect(found).toHaveLength(1); // grouped per bucket — two barren tabs, one design decision
    expect(found[0]!.page).toBe('run-detail');
    expect(found[0]!.message).toContain('declares 2 tabs');
    expect(found[0]!.message).toContain('“run-detail.why” and “run-detail.timeline”');
    expect(found[0]!.message).toContain('track presence, never position');
    // The remedy is the deepest-node rule, and it names both doors.
    expect(found[0]!.remedy).toContain('Sync pages; observe the deeper place');
    expect(found[0]!.remedy).toContain('session.observeFocus(<the tab path>)');
    expect(found[0]!.remedy).toContain('session.show(...) says which tab is VISIBLE');
    expect(found[0]!.remedy).toContain('neither moves the cursor');
    // …and it says what a static check cannot see, rather than pretending.
    expect(found[0]!.remedy).toContain('a static check cannot see a runtime call');
  });

  it('says nothing when the tabs hold their own controls', () => {
    const g = buildNavigationGraph('runs', {
      pages: {
        'run-detail': {
          actions: { export: { does: 'Export this run as JSON', writes: ['run.exported'] } },
          tabs: {
            why: { actions: { 'open-slice': { does: 'Open the causal slice' } } },
            timeline: { actions: { scrub: { does: 'Scrub to a step' } } },
          },
        },
      },
    } as never);
    expect(tabFindings(g)).toEqual([]);
  });

  it('says nothing when a control anywhere binds to the tab as a tab switch', () => {
    const g = buildNavigationGraph('runs', {
      pages: {
        'run-detail': {
          actions: {
            export: { does: 'Export this run as JSON', writes: ['run.exported'] },
            'to-why': { does: 'Open the why tab', binding: { kind: 'tab', target: 'run-detail.why' } },
            'to-timeline': {
              does: 'Open the timeline tab',
              binding: { kind: 'tab', target: 'run-detail.timeline' },
            },
          },
          tabs: { why: {}, timeline: {} },
        },
      },
    } as never);
    expect(tabFindings(g)).toEqual([]);
  });

  it('says nothing about a page that authors no controls at all — the live-store shape', () => {
    // Every action arrives from a live store or a mount, so every tab is barren
    // on paper and wired in life. This is the demo in demos/live-desk.
    const g = buildNavigationGraph('desk', {
      pages: {
        desk: { tabs: { inbox: { does: 'Open tickets' }, archive: { does: 'Dealt with' } } },
        settings: { actions: { save: { does: 'Save the settings', writes: ['settings.saved'] } } },
      },
    } as never);
    expect(tabFindings(g)).toEqual([]);
  });

  it('names only the barren siblings when some tabs are wired and some are not', () => {
    const g = buildNavigationGraph('runs', {
      pages: {
        'run-detail': {
          tabs: {
            why: { actions: { 'open-slice': { does: 'Open the causal slice' } } },
            notes: { does: 'Nothing but text' },
          },
        },
      },
    } as never);
    const found = tabFindings(g);

    expect(found).toHaveLength(1);
    expect(found[0]!.message).toContain('declares a tab (“run-detail.notes”)');
    expect(found[0]!.message).not.toContain('run-detail.why');
  });

  it('is a note, never an error — a graph that syncs its tabs is not broken', () => {
    const health = checkGraph(labelTabs());

    for (const f of tabFindings(labelTabs())) expect(f.severity).toBe('info');
    expect(health.ok).toBe(true);
    expect(health.errors).toBe(0);
    expect(health.warnings).toBe(0);
    expect(health.summary).toContain('✓ healthy');
    expect(health.byType.note.map((f) => f.code)).toContain('unevidenceable-tab');
  });
});
