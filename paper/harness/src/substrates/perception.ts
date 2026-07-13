/**
 * `perception` — the web-agent baseline: no declared structure at all. The
 * agent reads a serialized dump of the CURRENT page (what an AXTree/DOM
 * serialization would carry: visible text incl. untrusted content, plus
 * controls by accessible name) and acts through generic click/type primitives.
 * After every act it receives the fresh dump — the observe-after-act loop GUI
 * agents run, and exactly the per-turn cost C1 measures.
 *
 * PILOT STAND-IN (preregistration §7): the dump comes from the app's own
 * render model (`pageView()`), not a real browser AXTree. Directional only;
 * the full study swaps in browser serialization over the demo storefront.
 */
import type { Session } from 'hcifootprint';
import type { DressShopApp } from '../apps/dress-shop/store.js';
import { byControl } from '../apps/dress-shop/manifest.js';
import type { Substrate, ToolDef } from './types.js';
import { settle } from './types.js';

export function perceptionSubstrate(session: Session, app: DressShopApp): Substrate {
  const dump = (): string => {
    const view = app.pageView();
    const lines = [
      `[page] ${view.page}`,
      ...view.content.map((c) => `[text] ${c}`),
      ...view.controls.map((c) => `[${c.role}] "${c.name}"`),
    ];
    return lines.join('\n');
  };

  const tools: ToolDef[] = [
    {
      name: 'read_page',
      description: 'Read the current page: its visible text and its interactive controls.',
      input_schema: { type: 'object', properties: {}, additionalProperties: false },
    },
    {
      name: 'act',
      description:
        'Interact with one control on the current page by its accessible name — click a button or ' +
        'link, or type/select a value where the control takes one. Returns the page as it looks after.',
      input_schema: {
        type: 'object',
        properties: {
          control: { type: 'string', description: 'the accessible name, e.g. "Add to cart" or "Search"' },
          value: { type: 'string', description: 'the text/choice/id for controls that take a value' },
        },
        required: ['control'],
        additionalProperties: false,
      },
    },
  ];

  return {
    name: 'perception',
    contract: () =>
      'You operate the app like a GUI user: call read_page to see the current page, and act to ' +
      'click or type into a named control. You only ever see the page you are on. Ask the human ' +
      'in chat before placing an order.',
    tools: () => tools,
    dispatch: async (name, input) => {
      if (name === 'read_page') return dump();
      if (name === 'act') {
        const action = byControl.get(String(input['control'] ?? '').toLowerCase());
        if (!action) return `No control named "${String(input['control'])}" on this page.\n${dump()}`;
        const prop = action.input?.[0]?.name;
        const payload = prop === undefined ? undefined : { [prop]: String(input['value'] ?? '') };
        const fired = session.fire(action.id, { source: 'agent', payload });
        await settle();
        // A dead click is opaque in a real GUI: nothing happens, you just see the same page.
        return fired.ok ? dump() : `Nothing happened.\n${dump()}`;
      }
      return 'unknown tool';
    },
  };
}
