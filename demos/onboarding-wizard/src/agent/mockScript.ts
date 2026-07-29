import type { LLMRequest, LLMResponse } from 'agentfootprint';

/**
 * THE SCRIPTED MODEL — deterministic, offline, and derived from real results.
 *
 * `respond`, never `replies`: the replies cursor is per-instance and THROWS on
 * exhaustion, so a visitor who re-asks would blow the demo up. This function is
 * fully STATELESS — it reads the transcript it is handed (tool results included)
 * and decides one move — so the same conversation replays identically every
 * time, in `npm run dev` and in `npm test` alike, with no key and no network.
 *
 * What is SCRIPTED and what is DERIVED, stated plainly (the same split the
 * agentfootprint-demo mock draws):
 *   • SCRIPTED — the intent. "Signing up" means: make the journey feasible,
 *     then walk it, then stop and ask before the high-effect step. That is this
 *     demo's stand-in for a model's judgement, and it is a table, not a
 *     transcript.
 *   • DERIVED — every decision and every sentence. Which action unlocks the
 *     journey, which page to move to next, which step is ready, what shape the
 *     step expects, and every word of the final reply come out of results the
 *     session actually returned. Nothing here describes an outcome it did not
 *     read.
 *
 * The one convention it leans on is the app's own: navigation tools are named
 * `<page>.to-<page>`. A real model reads each action's `does` and picks; this
 * stand-in matches the name so the walk needs no judgement at all.
 */

/** What "sign me up" means. The only scripted thing in this file. */
const GOAL_SKILL = 'signup';
/** The leaf action that satisfies the goal journey's precondition. */
const UNLOCK_LEAF = 'verify-email';
/** Used only when a typed message names no person — and the reply says so. */
const PLACEHOLDER = { name: 'Sam Rivers', role: 'Product Manager' } as const;

const APPROVAL = /\b(yes|yep|yeah|confirm(ed)?|approve[d]?|go ahead|do it|please do)\b/i;

// ---------------------------------------------------------------------------
// Safe readers — a tool result is a plain bag; nothing below assumes a shape.
// ---------------------------------------------------------------------------

type Bag = Record<string, unknown>;

function bag(value: unknown): Bag | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Bag) : null;
}
function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
function num(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}
function list(value: unknown): Bag[] {
  return Array.isArray(value) ? value.flatMap((item) => (bag(item) ? [bag(item) as Bag] : [])) : [];
}

// ---------------------------------------------------------------------------
// The transcript, read back
// ---------------------------------------------------------------------------

interface Transcript {
  /** Every tool result in order, parsed. */
  results: Bag[];
  last: Bag | null;
  /** The most recent whats_here result (it is the only one carrying `actions`). */
  lastLook: Bag | null;
  /** The most recent skill-tool result (frame state, ready/later steps). */
  lastSkill: Bag | null;
  /** The person's most recent message, envelope stripped. */
  said: string;
  /**
   * The `input` payloads actually SENT on this run's tool calls. The final
   * reply reads its facts from here rather than re-parsing the message,
   * because the message that ends a turn ("yes, go ahead") is not the message
   * the profile came from — and re-parsing it would report a fallback that
   * never happened.
   */
  sentInputs: Bag[];
}

/** The demo's own envelope — the session brief the chat loop prefixes each turn. */
function stripEnvelope(content: string): string {
  const end = content.lastIndexOf('</session-context>');
  return end === -1 ? content : content.slice(end + '</session-context>'.length).trim();
}

function readTranscript(req: LLMRequest): Transcript {
  const results: Bag[] = [];
  const sentInputs: Bag[] = [];
  let said = '';
  for (const message of req.messages) {
    if (message.role === 'tool') {
      const parsed = safeParse(message.content);
      if (parsed) results.push(parsed);
      continue;
    }
    if (message.role === 'assistant') {
      for (const call of message.toolCalls ?? []) {
        const input = bag((call.args as Bag | undefined)?.input);
        if (input) sentInputs.push(input);
      }
      continue;
    }
    if (message.role === 'user' && message.content.trim().length > 0) {
      said = stripEnvelope(message.content);
    }
  }
  const lastLook = [...results].reverse().find((result) => 'actions' in result) ?? null;
  const lastSkill =
    [...results].reverse().find((result) => 'readySteps' in result || 'frame' in result) ?? null;
  return { results, last: results[results.length - 1] ?? null, lastLook, lastSkill, said, sentInputs };
}

function safeParse(content: string): Bag | null {
  try {
    return bag(JSON.parse(content));
  } catch {
    // A non-JSON tool result is not a crash — it is simply not a result this
    // stand-in can read, and the planner falls back to looking around.
    return null;
  }
}

// ---------------------------------------------------------------------------
// Tool names, taken from the request the agent actually sent
// ---------------------------------------------------------------------------

interface ToolNames {
  whatsHere: string;
  doAction: string;
  goalSkill: string;
}

function toolNames(req: LLMRequest): ToolNames | null {
  const names = (req.tools ?? []).map((tool) => tool.name);
  const find = (suffix: string): string => names.find((name) => name.endsWith(suffix)) ?? '';
  const found = {
    whatsHere: find('whats_here'),
    doAction: find('do_action'),
    // Skill tools are named '<graph>.skill.<id>'; sanitising turns the dots into
    // underscores, so the id is what survives on the end.
    goalSkill: find(`skill_${GOAL_SKILL}`),
  };
  return found.whatsHere && found.doAction && found.goalSkill ? found : null;
}

// ---------------------------------------------------------------------------
// Intent — what the person asked for, parsed from their own words
// ---------------------------------------------------------------------------

export interface SignupIntent {
  name: string;
  role: string;
  /** Whether the words came from the message or from the placeholder. */
  nameFound: boolean;
  roleFound: boolean;
  /** The raw message, for enum matching against a served schema. */
  said: string;
}

export function readIntent(said: string): SignupIntent {
  const labelled = (label: string): string =>
    new RegExp(`\\b${label}\\s*:\\s*([^;,\\n]+)`, 'i').exec(said)?.[1]?.trim() ?? '';
  // "…as Ada Lovelace, an engineer, …" — the name is what follows "as", the
  // role is the next comma-delimited phrase with its article dropped.
  const naturalName = /\bas\s+([^,;\n]+?)\s*,/i.exec(said)?.[1]?.trim() ?? '';
  const naturalRole = /,\s*(?:an?\s+)?([^,;\n]+?)\s*,/i.exec(said)?.[1]?.trim() ?? '';
  const name = labelled('name') || naturalName;
  const role = labelled('role') || naturalRole;
  return {
    name: name || PLACEHOLDER.name,
    role: role || PLACEHOLDER.role,
    nameFound: name.length > 0,
    roleFound: role.length > 0,
    said,
  };
}

/**
 * Build a step's payload from the shape the app ADVERTISED plus the person's
 * own words. The keys come from `expects` (the step's real schema, served in
 * the result); the values come from the message. An enum is honoured by
 * matching the message against the declared options — so "on the pro plan"
 * picks 'pro' because the schema said 'pro' was a thing, not because this file
 * did.
 */
export function payloadFromExpects(expects: unknown, intent: SignupIntent): Bag | undefined {
  const schema = bag(expects);
  const properties = bag(schema?.properties);
  if (!schema || !properties) return undefined;
  const required = Array.isArray(schema.required) ? schema.required.map(String) : Object.keys(properties);
  const payload: Bag = {};
  for (const key of required) {
    const property = bag(properties[key]);
    const options = Array.isArray(property?.enum) ? property.enum.map(String) : [];
    if (options.length > 0) {
      const lowered = intent.said.toLowerCase();
      payload[key] = options.find((option) => lowered.includes(option.toLowerCase())) ?? options[0];
      continue;
    }
    payload[key] = key === 'role' ? intent.role : key === 'name' ? intent.name : intent.said;
  }
  return payload;
}

// ---------------------------------------------------------------------------
// The planner — one move per call, every input a real result
// ---------------------------------------------------------------------------

type Move =
  | { kind: 'call'; tool: string; args: Bag }
  | { kind: 'say'; text: string };

/** 'plan.choose-plan' lives on page 'plan'. */
function pageOf(stepId: string): string {
  return stepId.split('.')[0] ?? '';
}

function decide(transcript: Transcript, names: ToolNames): Move {
  const { last, lastLook, lastSkill, said } = transcript;
  const intent = readIntent(said);
  const approved = APPROVAL.test(said);
  const youAreOn = str(last?.youAreOn) || str(lastLook?.youAreOn);
  const since = num(last?.version);

  const look = (): Move => ({
    kind: 'call',
    tool: names.whatsHere,
    // Every look after the first asks for the DELTA — who did what since the
    // last result the model saw. The actions and skills come back in full
    // either way; only the narration narrows.
    args: since === undefined ? {} : { sinceVersion: since },
  });

  /**
   * Has the world moved since the last look? `version` is the session's own
   * optimistic-concurrency cursor and it bumps on every fire, every state
   * report and every structure change — so comparing it is the exact question
   * "is the action list I am holding still true?". Anything derived from a
   * stale look (which actions exist, whether the journey is feasible) has to
   * re-read before it is trusted.
   */
  const lookIsStale = (): boolean => (num(lastLook?.version) ?? -1) < (num(last?.version) ?? -1);

  // 1. Nothing has happened yet: look before acting.
  if (!last) return look();

  // 2. The high-effect gate. The receipts are in hand; the person has not
  //    approved, so the turn ENDS here with what they need to decide. Confirming
  //    on their behalf would make the gate decorative.
  if (str(last.judgment) === 'needs-confirm') {
    if (!approved) return { kind: 'say', text: confirmRequestText(transcript, last) };
    return {
      kind: 'call',
      tool: names.goalSkill,
      args: { step: str(last.step), confirm: true },
    };
  }

  // 3. The journey finished — the frame closed itself when its last step landed.
  if (str(last.frame) === 'completed' || str(last.judgment) === 'done') {
    return { kind: 'say', text: completedText(transcript, youAreOn) };
  }

  // 4. Nothing has been looked at yet in this run.
  if (!lastLook) return look();

  const goal = list(lastLook.skills).find((skill) => str(skill.skill) === GOAL_SKILL);
  if (!goal) {
    return { kind: 'say', text: `This app does not offer a '${GOAL_SKILL}' journey, so I cannot start one.` };
  }

  // 5. The journey is not feasible yet. Feasibility is a fact only a LOOK
  //    reports — no fire result mentions it — so a stale look must be refreshed
  //    before this branch is trusted.
  if (goal.feasible !== true) {
    if (lookIsStale()) return look();
    const unlock = list(lastLook.actions).find((action) => str(action.action) === `${youAreOn}.${UNLOCK_LEAF}`);
    if (unlock) return doAction(names, str(unlock.action));
    return {
      kind: 'say',
      text:
        `The signup journey is not feasible from ${youAreOn || 'here'} yet, and nothing on this page ` +
        `unlocks it. Someone needs to complete the step it is waiting on.`,
    };
  }

  // 6. A frame is open: walk it.
  if (str(lastSkill?.frame) === 'open') {
    const ready = list(lastSkill?.readySteps);
    const first = ready[0];
    if (first) {
      const step = str(first.step);
      const payload = payloadFromExpects(first.expects, intent);
      return {
        kind: 'call',
        tool: names.goalSkill,
        args: payload === undefined ? { step } : { step, input: payload },
      };
    }
    // Nothing is ready here. The next unfinished step names its own page.
    const later = list(lastSkill?.laterSteps).find((step) => str(step.status) !== 'done');
    const target = later ? pageOf(str(later.step)) : '';
    if (target && target !== youAreOn) return forward(names, lastLook, youAreOn, target, lookIsStale());
    // We are where the next step lives, and nothing came back ready TWICE in a
    // row at the same cursor: re-serving again would only repeat the answer.
    // Say what is stuck instead of burning the iteration budget.
    if (nothingReadyTwice(transcript)) {
      return {
        kind: 'say',
        text:
          `The signup journey is open but nothing is ready to run on the ${youAreOn} page` +
          `${later ? `; it is waiting on ${str(later.step)}` : ''}. Something the step depends on has not happened yet.`,
      };
    }
    // Re-serve the frame so its ready list reflects THIS page.
    return { kind: 'call', tool: names.goalSkill, args: {} };
  }

  // 7. No frame yet. Try to open the journey right here. If its first step
  //    cannot act from this page the gate refuses — and the honest recovery is
  //    to move one step forward and try again (rule 8).
  if (str(last.reason) !== 'ENTRY_NOT_MATERIALIZED') {
    return { kind: 'call', tool: names.goalSkill, args: {} };
  }

  // 8. The gate refused: the journey cannot be entered from this page. Take the
  //    one forward move this page offers and try again.
  return forward(names, lastLook, youAreOn, '', lookIsStale());
}

/**
 * Two consecutive frame re-serves that both came back with nothing ready. One
 * is ordinary (the previous call's result was built before the app settled);
 * two means asking a third time would return the same answer.
 */
function nothingReadyTwice(transcript: Transcript): boolean {
  const tail = transcript.results.slice(-2);
  return (
    tail.length === 2 &&
    tail.every((result) => str(result.frame) === 'open' && list(result.readySteps).length === 0)
  );
}

function doAction(names: ToolNames, action: string): Move {
  return { kind: 'call', tool: names.doAction, args: { action } };
}

/**
 * The forward navigation available here. With a target page, the app's own
 * `<page>.to-<page>` name is looked up exactly — an exact match, never a
 * fuzzy one, so `profile.back-to-welcome` can never be mistaken for progress.
 * Without a target, the single forward action on this page is taken.
 *
 * A stale look is re-read first. Which navigations exist changes with state
 * (this app's `to-plan` is guarded on the profile being saved), so choosing
 * from an old list would conclude "there is no way forward" about a page that
 * has one.
 */
function forward(
  names: ToolNames,
  lastLook: Bag,
  youAreOn: string,
  target: string,
  lookIsStale: boolean,
): Move {
  if (lookIsStale) {
    return {
      kind: 'call',
      tool: names.whatsHere,
      args: { sinceVersion: num(lastLook.version) ?? 0 },
    };
  }
  const actions = list(lastLook.actions).map((action) => str(action.action));
  const exact = target ? actions.find((id) => id === `${youAreOn}.to-${target}`) : undefined;
  const onward = exact ?? actions.find((id) => id.startsWith(`${youAreOn}.to-`));
  if (onward) return doAction(names, onward);
  return {
    kind: 'say',
    text: `There is no way forward from ${youAreOn || 'this page'}: nothing here navigates onward.`,
  };
}

// ---------------------------------------------------------------------------
// The sentences — assembled from results, never canned
// ---------------------------------------------------------------------------

function confirmRequestText(transcript: Transcript, result: Bag): string {
  const receipts = bag(result.receipts);
  const willDo = bag(receipts?.willDo);
  const does = str(willDo?.does) || str(result.does);
  const writes = Array.isArray(willDo?.writes) ? willDo.writes.map(String) : [];
  const goes = str(willDo?.navigatesTo);
  const parts: string[] = [];
  // What this turn actually put into the app, read off the payloads it sent.
  const filled = filledFields(transcript);
  if (filled.length > 0) parts.push(`I filled in ${filled.join(', ')}.`);
  parts.push(`One step left, and it needs your say-so: ${does}`);
  if (writes.length > 0) parts.push(`It will change ${writes.join(', ')}.`);
  if (goes) parts.push(`It will take you to the ${goes} page.`);
  const note = placeholderNote(transcript);
  if (note) parts.push(note);
  parts.push('Say yes and I will do it.');
  return parts.join(' ');
}

/** `field: value` for every payload key this turn actually sent. */
function filledFields(transcript: Transcript): string[] {
  const filled: string[] = [];
  for (const input of transcript.sentInputs) {
    for (const [key, value] of Object.entries(input)) {
      if (typeof value === 'string' && value.length > 0) filled.push(`${key} ${value}`);
    }
  }
  return filled;
}

/**
 * Reported from the payload that was actually SENT, never from re-reading the
 * message: a turn that ends on "yes, go ahead" names nobody, and claiming a
 * fallback about a profile filled in an earlier turn would describe something
 * this turn did not do.
 */
function placeholderNote(transcript: Transcript): string | null {
  const sentName = transcript.sentInputs.map((input) => str(input.name)).find((name) => name.length > 0);
  const sentRole = transcript.sentInputs.map((input) => str(input.role)).find((role) => role.length > 0);
  if (sentName === PLACEHOLDER.name) {
    return `Your message named no person, so I used "${PLACEHOLDER.name}" — change it on the profile step if that is wrong.`;
  }
  if (sentRole === PLACEHOLDER.role) {
    return `Your message named no role, so I used "${PLACEHOLDER.role}" — change it on the profile step if that is wrong.`;
  }
  return null;
}

function completedText(transcript: Transcript, youAreOn: string): string {
  // What actually fired: every result that reported a performed action.
  const did = transcript.results
    .filter((result) => result.ok === true && typeof result.did === 'string')
    .map((result) => str(result.did));
  const parts: string[] = [];
  parts.push(did.length > 0 ? `Done — ${did.join(', then ')}.` : 'Done.');
  if (youAreOn) parts.push(`You are on the ${youAreOn} page.`);
  const note = placeholderNote(transcript);
  if (note) parts.push(note);
  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// The provider callback
// ---------------------------------------------------------------------------

export function wizardRespond(req: LLMRequest): Partial<LLMResponse> {
  const names = toolNames(req);
  if (!names) {
    // The agent sent no tools (or not the ones this stand-in speaks). Saying so
    // is the honest answer; pretending to act would be a lie about a run.
    return { content: 'I have no tools for this app, so there is nothing I can do here.', toolCalls: [] };
  }
  const transcript = readTranscript(req);
  const move = decide(transcript, names);
  if (move.kind === 'say') return { content: move.text, toolCalls: [] };
  return {
    content: '',
    toolCalls: [{ id: `call_${transcript.results.length + 1}`, name: move.tool, args: move.args }],
  };
}
