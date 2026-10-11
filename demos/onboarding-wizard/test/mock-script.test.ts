import { describe, expect, it } from 'vitest';

import { payloadFromExpects, readIntent, wizardRespond } from '../src/agent/mockScript.js';
import type { LLMRequest } from 'agentfootprint';
import { serveToAgent } from 'hcifootprint';
import { createWizardApp } from '../src/app/wizard.js';
import { STARTER_MESSAGES } from '../src/agent/systemPrompt.js';
import { sanitizeToolName } from '../src/agent/tools.js';

/**
 * The scripted model's two derivations, tested on their own. Everything else
 * about it is exercised end to end by the agent test — these are the pieces
 * where being wrong would be silent rather than loud.
 */
describe('reading what the person asked for', () => {
  it('reads a name and a role out of an ordinary sentence', () => {
    const intent = readIntent(STARTER_MESSAGES[0]);
    expect(intent).toMatchObject({ name: 'Ada Lovelace', role: 'engineer', nameFound: true, roleFound: true });
  });

  it('reads them out of a labelled one too', () => {
    const intent = readIntent(STARTER_MESSAGES[1]);
    expect(intent).toMatchObject({ name: 'Grace Hopper', role: 'Rear Admiral', nameFound: true, roleFound: true });
  });

  it('falls back to a placeholder and SAYS it fell back', () => {
    const intent = readIntent('sign me up please');
    expect(intent.nameFound).toBe(false);
    expect(intent.roleFound).toBe(false);
    expect(intent.name.length).toBeGreaterThan(0);
  });
});

describe('building a payload from the shape the app advertised', () => {
  const profileSchema = {
    type: 'object',
    properties: { name: { type: 'string' }, role: { type: 'string' } },
    required: ['name', 'role'],
  };
  const planSchema = {
    type: 'object',
    properties: { plan: { type: 'string', enum: ['free', 'pro', 'team'] } },
    required: ['plan'],
  };

  it('takes the KEYS from the schema and the VALUES from the message', () => {
    const intent = readIntent(STARTER_MESSAGES[0]);
    expect(payloadFromExpects(profileSchema, intent)).toEqual({ name: 'Ada Lovelace', role: 'engineer' });
  });

  it('honours a declared enum by matching the person’s words against the OPTIONS', () => {
    expect(payloadFromExpects(planSchema, readIntent('… on the pro plan.'))).toEqual({ plan: 'pro' });
    expect(payloadFromExpects(planSchema, readIntent('plan: team'))).toEqual({ plan: 'team' });
    // No option named: the first declared one, never an invented value.
    expect(payloadFromExpects(planSchema, readIntent('just sign me up'))).toEqual({ plan: 'free' });
  });

  it('sends no payload at all when the step advertised no shape', () => {
    expect(payloadFromExpects(undefined, readIntent('hi'))).toBeUndefined();
  });
});

describe('tool names an LLM will accept', () => {
  it('turns the library’s dotted MCP names into [A-Za-z0-9_-]', () => {
    expect(sanitizeToolName('onboarding.journey.import-signup')).toBe('onboarding_journey_import-signup');
    expect(sanitizeToolName('onboarding.whats_here')).toBe('onboarding_whats_here');
    expect(sanitizeToolName('a b/c')).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe('scoped journey discovery', () => {
  it('consults an advertised journey omitted from the current page, then follows its real refusal', () => {
    const app = createWizardApp();
    try {
      const port = serveToAgent(app.session);
      const look = port.call('onboarding.whats_here', {});
      expect(look.journeysElsewhere).toBe(1);
      expect(look.journeys).not.toContainEqual(expect.objectContaining({ journey: 'signup' }));
      const request: LLMRequest = {
        model: 'scripted',
        messages: [{ role: 'tool', content: JSON.stringify(look), toolCallId: 'look' }],
        tools: port.tools().map((tool) => ({ ...tool, name: sanitizeToolName(tool.name) })),
      };
      expect(wizardRespond(request).toolCalls).toEqual([
        { id: 'call_2', name: 'onboarding_journey_signup', args: {} },
      ]);
      const refused = port.call('onboarding.journey.signup', {});
      expect(refused).toMatchObject({ judgment: 'blocked', journey: 'signup' });
      expect(app.store.snapshot().emailVerified).toBe(false);
      const next = wizardRespond({
        ...request,
        messages: [...request.messages, { role: 'tool', content: JSON.stringify(refused), toolCallId: 'journey' }],
      });
      expect(next.toolCalls).toEqual([
        { id: 'call_3', name: 'onboarding_do_action', args: { action: 'welcome.verify-email' } },
      ]);
      // Reading a refusal proposes an ordinary app action; it never changes state itself.
      expect(app.store.snapshot().emailVerified).toBe(false);
    } finally {
      app.destroy();
    }
  });
});
