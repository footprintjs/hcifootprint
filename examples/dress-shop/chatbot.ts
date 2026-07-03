/**
 * Dress-shop chatbot — Claude drives the mock app through HCIFootprint.
 *
 * The loop demonstrates the full serving contract:
 *  - each turn injects contextBrief({sinceVersion}) — what the user did between questions
 *  - skills are served as one-line plans (list_skills); committing expands tools
 *  - Claude's action tools are regenerated per request from session.toMCPTools()
 *    (position + guards decide what exists; names sanitized: '.' → '__')
 *  - every fire carries source 'agent'; type `!affordance-id {json}` at the prompt
 *    to simulate a MANUAL user action between questions — provenance interleaves.
 *
 * Run:  npm run demo:chat   (credentials resolve from ANTHROPIC_API_KEY or `ant auth login`)
 */
import readline from 'node:readline/promises';
import Anthropic from '@anthropic-ai/sdk';
import { createDressShopApp } from './store.js';

const MODEL = 'claude-opus-4-8';

const SYSTEM = `You are the shopping assistant for a small dress store. You act on the LIVE app
through tools that mirror what is possible on the user's current page — the tool list changes as
they (or you) move around. Work method: read the session context given each turn (who did what,
where the user is now); use list_skills/skill_plan to plan; commit_skill before walking a
multi-step task, leave_skill when done or when plans change; fire action tools to act. Actions
marked high-effect (like placing an order) need the user's explicit confirmation in chat first.
If a tool is rejected (guard failed / stale), replan from the fresh context instead of retrying
blindly. Keep replies short and grounded in what actually happened.`;

async function main(): Promise<void> {
  const app = createDressShopApp();
  const session = app.session;
  const client = new Anthropic();
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const history: Anthropic.MessageParam[] = [];
  let lastTurnVersion = 0;

  console.log('dress-shop chatbot — chat normally; `!affordance-id {"json":"payload"}` simulates a');
  console.log('manual user click; /state /brief /quit are local commands.\n');

  for (;;) {
    const line = (await rl.question('you> ')).trim();
    if (!line) continue;
    if (line === '/quit') break;
    if (line === '/state') {
      console.log(JSON.stringify(session.state(), null, 2));
      continue;
    }
    if (line === '/brief') {
      console.log(session.contextBrief().text);
      continue;
    }
    if (line.startsWith('!')) {
      // Simulated MANUAL action: the human drives the app directly (source 'user').
      const [id, ...rest] = line.slice(1).split(' ');
      const payload = rest.length > 0 ? JSON.parse(rest.join(' ')) : undefined;
      const result = session.fire(id, { source: 'user', payload });
      console.log(result.ok ? `  [user fired ${id}]` : `  [rejected: ${result.reason}]`);
      await new Promise((resolve) => setTimeout(resolve, 0)); // let the handler settle
      continue;
    }

    // ── one chat turn: brief + question in, tool loop until end_turn ────────
    const brief = session.contextBrief({ sinceVersion: lastTurnVersion });
    history.push({
      role: 'user',
      content: `<session-context>\n${brief.text}\n</session-context>\n\n${line}`,
    });

    for (;;) {
      const { tools, dispatch } = buildTools(session);
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 16000,
        thinking: { type: 'adaptive' },
        system: SYSTEM,
        tools,
        messages: history,
      });

      for (const block of response.content) {
        if (block.type === 'text') console.log(`claude> ${block.text}`);
      }
      history.push({ role: 'assistant', content: response.content });

      if (response.stop_reason !== 'tool_use') break;

      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;
        const output = await dispatch(block.name, block.input);
        console.log(`  [tool ${block.name}]`);
        results.push({ type: 'tool_result', tool_use_id: block.id, content: output });
      }
      history.push({ role: 'user', content: results }); // all results in ONE message
    }
    lastTurnVersion = session.version;
  }
  rl.close();
}

/** Meta tools + the session's CURRENT action tools (regenerated every request). */
function buildTools(session: ReturnType<typeof createDressShopApp>['session']): {
  tools: Anthropic.Tool[];
  dispatch: (name: string, input: unknown) => Promise<string>;
} {
  const nameMap = new Map<string, string>(); // sanitized tool name → affordanceId
  const actionTools: Anthropic.Tool[] = session.toMCPTools().map((tool) => {
    const safeName = tool.name.replace(/[^a-zA-Z0-9_-]/g, '__');
    if (tool.name === 'dress-shop.leave-skill') nameMap.set(safeName, 'leave-skill');
    else nameMap.set(safeName, tool.name.replace(/^dress-shop\./, ''));
    return {
      name: safeName,
      description: tool.description,
      input_schema: tool.inputSchema as Anthropic.Tool.InputSchema,
    };
  });

  const metaTools: Anthropic.Tool[] = [
    {
      name: 'list_skills',
      description:
        'List the multi-step skills this app offers, with live feasibility from the current position.',
      input_schema: { type: 'object', properties: {}, additionalProperties: false },
    },
    {
      name: 'skill_plan',
      description:
        'Show a skill\'s step plan: derived dependencies and live status (done/ready/blocked/off-node).',
      input_schema: {
        type: 'object',
        properties: { skillId: { type: 'string' } },
        required: ['skillId'],
        additionalProperties: false,
      },
    },
    {
      name: 'commit_skill',
      description:
        'Commit to a skill before walking its steps — the action tools then narrow to that skill.',
      input_schema: {
        type: 'object',
        properties: { skillId: { type: 'string' } },
        required: ['skillId'],
        additionalProperties: false,
      },
    },
    {
      name: 'why',
      description:
        'Explain why a state key has its value — the causal chain of actions that produced it.',
      input_schema: {
        type: 'object',
        properties: { key: { type: 'string' } },
        required: ['key'],
        additionalProperties: false,
      },
    },
  ];

  const dispatch = async (name: string, input: unknown): Promise<string> => {
    const args = (input ?? {}) as Record<string, unknown>;
    if (name === 'list_skills') return JSON.stringify(session.availableSkills(), null, 1);
    if (name === 'skill_plan') return JSON.stringify(session.skillPlan(String(args['skillId'])), null, 1);
    if (name === 'commit_skill') {
      return JSON.stringify(session.commitSkill(String(args['skillId']), { source: 'agent' }), null, 1);
    }
    if (name === 'why') return session.why(String(args['key']));

    const affordanceId = nameMap.get(name);
    if (!affordanceId) return `Unknown tool '${name}'.`;
    if (affordanceId === 'leave-skill') {
      return JSON.stringify(session.leaveSkill() ?? { note: 'no skill frame was open' });
    }
    const result = session.fire(affordanceId, {
      source: 'agent',
      expectedVersion: session.version,
      payload: Object.keys(args).length > 0 ? args : undefined,
    });
    await new Promise((resolve) => setTimeout(resolve, 0)); // let the app handler settle
    return JSON.stringify(
      result.ok
        ? { ok: true, settlement: result.settlement, nowOn: session.node }
        : result,
      null,
      1,
    );
  };

  return { tools: [...metaTools, ...actionTools], dispatch };
}

main().catch((error) => {
  if (error instanceof Anthropic.AuthenticationError) {
    console.error(
      'No Claude API credentials found. Set ANTHROPIC_API_KEY or run `ant auth login`, then retry.',
    );
    process.exit(1);
  }
  throw error;
});
