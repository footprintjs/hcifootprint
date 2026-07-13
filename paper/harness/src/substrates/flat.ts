/**
 * `flat` — the WebMCP-style baseline: one always-visible tool per DECLARED
 * action, carrying the SAME authored descriptions the map uses (fairness rule
 * 4 — this is not a strawman; it is `navigator.modelContext` with our own
 * strings). No position, no guards, no brief, no provenance. Tool returns
 * mirror what a WebMCP adopter would naturally wire per tool (search returns
 * matches, add-to-cart returns the count, …). Failures are terse — a page
 * tool that can't act right now, with none of the map's typed evidence.
 */
import type { Session } from 'hcifootprint';
import type { DressShopApp } from '../apps/dress-shop/store.js';
import { DECLARED_ACTIONS, byId } from '../apps/dress-shop/manifest.js';
import type { Substrate, ToolDef } from './types.js';
import { settle } from './types.js';

export function flatSubstrate(session: Session, app: DressShopApp): Substrate {
  const tools: ToolDef[] = DECLARED_ACTIONS.map((action) => ({
    name: action.id.replace(/[^a-zA-Z0-9_-]/g, '_'),
    description: action.description + (action.highEffect ? ' (irreversible)' : ''),
    input_schema: {
      type: 'object',
      properties: Object.fromEntries(
        (action.input ?? []).map((p) => [p.name, { type: 'string', description: p.description }]),
      ),
      required: (action.input ?? []).map((p) => p.name),
      additionalProperties: false,
    },
  }));

  /** What a reasonably wired page tool would return on success. */
  const naturalReturn = (id: string): Record<string, unknown> => {
    const state = session.state();
    const view = app.pageView();
    switch (id) {
      case 'search-dresses':
      case 'filter-by-color':
        return { results: view.content };
      case 'view-dress':
        return { dress: view.content };
      case 'add-to-cart':
        return { cartCount: state['cartCount'] };
      case 'place-order':
        return { orderId: state['lastOrderId'] };
      case 'check-order-status':
        return { status: state['orderStatus'] };
      default:
        return { done: true };
    }
  };

  return {
    name: 'flat',
    contract: () =>
      'You operate the app through its action tools. Every listed tool is callable at any time, ' +
      'but a call may fail if the app cannot do that right now. Ask the human in chat before ' +
      'placing an order.',
    tools: () => tools,
    dispatch: async (name, input) => {
      const action = byId.get(name.replace(/_/g, '-')) ?? byId.get(name);
      if (!action) return JSON.stringify({ ok: false, error: 'unknown tool' });
      const payload = Object.keys(input).length > 0 ? input : undefined;
      const fired = session.fire(action.id, { source: 'agent', payload });
      if (!fired.ok) {
        // Terse by design: a flat page tool exposes no typed evidence.
        return JSON.stringify({ ok: false, error: 'the app could not perform this action right now' });
      }
      await settle();
      return JSON.stringify({ ok: true, ...naturalReturn(action.id) });
    },
  };
}
